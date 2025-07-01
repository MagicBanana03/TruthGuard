from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for, flash
from datetime import datetime
import json
from game_generator import content_generator
from models import GameLevel, UserGameProgress, GameSession
from database import get_db_session
from auth import login_required

game_bp = Blueprint('game', __name__, url_prefix='/game')

@game_bp.route('/')
@login_required
def game_home():
    """Game home page showing all levels and progress."""
    db_session = get_db_session()
    try:
        # Get all levels
        levels = db_session.query(GameLevel).order_by(GameLevel.level_number).all()
        
        if not levels:
            return render_template('game/home.html', 
                                 levels=[], 
                                 playable_levels=[], 
                                 completed_levels=[],
                                 total_score=0,
                                 completion_rate=0.0,
                                 active_page='game')
        
        # Get user's progress for all levels
        user_progress = db_session.query(UserGameProgress).filter_by(
            user_id=session['user_id']
        ).all()
        
        # Create mappings for easier lookup
        progress_by_level = {p.level_id: p for p in user_progress}
        completed_levels = [p.level_id for p in user_progress if p.completed]
        
        # Determine which levels are playable
        playable_levels = []
        for i, level in enumerate(levels):
            if level.level_number == 1:
                # First level is always playable
                playable_levels.append(True)
            elif level.id in completed_levels:
                # Already completed levels are always playable (for replay)
                playable_levels.append(True)
            elif i > 0:
                # Check if previous level is completed
                prev_level = levels[i-1]
                prev_completed = prev_level.id in completed_levels
                playable_levels.append(prev_completed)
            else:
                playable_levels.append(False)
        
        # Calculate stats
        total_score = sum(p.score for p in user_progress if p.completed)
        completion_rate = (len(completed_levels) / len(levels)) * 100 if levels else 0
        
        return render_template('game/home.html', 
                             levels=levels,
                             playable_levels=playable_levels,
                             completed_levels=completed_levels,
                             total_score=total_score,
                             completion_rate=completion_rate,
                             active_page='game')
    
    except Exception as e:
        print(f"Error in game_home: {e}")
        return render_template('game/home.html', 
                             levels=[], 
                             playable_levels=[], 
                             completed_levels=[],
                             total_score=0,
                             completion_rate=0.0,
                             active_page='game')
    finally:
        db_session.close()

@game_bp.route('/level/<int:level_id>')
@login_required
def play_level(level_id):
    """Play a specific level with COMPLETELY fresh dynamically generated content every time."""
    db_session = get_db_session()
    try:
        # Get the level template
        level = db_session.query(GameLevel).filter_by(id=level_id).first()
        if not level:
            flash('Level not found.', 'error')
            return redirect(url_for('game.game_home'))
        
        # Check if user can play this level
        if level.level_number > 1:
            # Get previous level
            prev_level = db_session.query(GameLevel).filter_by(
                level_number=level.level_number - 1
            ).first()
            
            if prev_level:
                # Check if previous level is completed
                prev_progress = db_session.query(UserGameProgress).filter_by(
                    user_id=session['user_id'], 
                    level_id=prev_level.id,
                    completed=True
                ).first()
                
                if not prev_progress:
                    flash('You must complete the previous level first.', 'warning')
                    return redirect(url_for('game.game_home'))
        
        # ALWAYS deactivate any existing sessions for this user
        existing_sessions = db_session.query(GameSession).filter_by(
            user_id=session['user_id'],
            is_active=True
        ).all()
        
        for existing_session in existing_sessions:
            existing_session.is_active = False
        
        # ALWAYS generate completely fresh content - never reuse anything
        print(f"🔄 Generating FRESH content for Level {level.level_number} (Difficulty: {level.difficulty}) - User: {session['user_id']}")
        fresh_content = content_generator.generate_level_content(level.level_number, level.difficulty)
        
        if not fresh_content:
            print("❌ Failed to generate fresh content, using fallback")
            flash('Failed to generate level content. Please try again.', 'error')
            return redirect(url_for('game.game_home'))
        
        print(f"✅ Successfully generated fresh content: {fresh_content.get('headline', 'No headline')[:100]}...")
        
        # Create new game session with the fresh generated content
        session_data = {
            'evidence_viewed': [],
            'generated_content': fresh_content,
            'content_generated_at': datetime.utcnow().isoformat(),
            'generation_id': f"{level.level_number}_{session['user_id']}_{datetime.utcnow().timestamp()}"  # Unique ID for this generation
        }
        
        game_session = GameSession(
            user_id=session['user_id'],
            level_id=level.id,
            session_data=json.dumps(session_data)
        )
        db_session.add(game_session)
        db_session.commit()
        
        # Create a dynamic level object with the fresh content
        dynamic_level = type('DynamicLevel', (), {
            'id': level.id,
            'level_number': level.level_number,
            'title': level.title,
            'difficulty': level.difficulty,
            'time_limit': level.time_limit,
            'headline': fresh_content.get('headline', 'Breaking News'),
            'article_snippet': fresh_content.get('article_snippet', ''),
            'is_fake': fresh_content.get('is_fake', False),
            'facebook_posts': fresh_content.get('facebook_posts', []),
            'news_articles': fresh_content.get('news_articles', []),
            'expert_opinions': fresh_content.get('expert_opinions', [])
        })()
        
        print(f"🎮 Serving Level {level.level_number} with fresh content to user {session['user_id']}")
        
        return render_template('game/level.html', 
                             level=dynamic_level, 
                             session_id=game_session.id,
                             active_page='game')
    
    except Exception as e:
        db_session.rollback()
        print(f"❌ Error in play_level: {e}")
        flash('An error occurred while loading the level.', 'error')
        return redirect(url_for('game.game_home'))
    finally:
        db_session.close()

@game_bp.route('/api/evidence/<int:session_id>/<evidence_type>')
@login_required
def get_evidence(session_id, evidence_type):
    """Get evidence data from the dynamically generated content."""
    db_session = get_db_session()
    try:
        game_session = db_session.query(GameSession).filter_by(
            id=session_id, user_id=session['user_id'], is_active=True
        ).first()
        
        if not game_session:
            return jsonify({'error': 'Invalid session'}), 404
        
        # Parse session data to get generated content
        session_data = game_session.session_data
        if isinstance(session_data, str):
            try:
                session_data = json.loads(session_data)
            except:
                session_data = {}
        
        generated_content = session_data.get('generated_content', {})
        
        # Get evidence from generated content
        evidence_data = []
        try:
            if evidence_type == 'facebook':
                evidence_data = generated_content.get('facebook_posts', [])
            elif evidence_type == 'news':
                evidence_data = generated_content.get('news_articles', [])
            elif evidence_type == 'experts':
                evidence_data = generated_content.get('expert_opinions', [])
        except Exception as e:
            print(f"Error extracting evidence: {e}")
            evidence_data = get_fallback_evidence(evidence_type)
        
        # Ensure evidence_data is always a list
        if not isinstance(evidence_data, list):
            evidence_data = get_fallback_evidence(evidence_type)
        
        if not evidence_data:
            # Create fallback evidence if none exists
            evidence_data = get_fallback_evidence(evidence_type)
        
        # Track evidence viewing
        viewed = session_data.get('evidence_viewed', [])
        if evidence_type not in viewed:
            viewed.append(evidence_type)
            session_data['evidence_viewed'] = viewed
            game_session.session_data = json.dumps(session_data)
            db_session.commit()
        
        return jsonify({
            'evidence': evidence_data,
            'type': evidence_type,
            'success': True
        })
    except Exception as e:
        print(f"Error getting evidence: {e}")
        # Return fallback evidence instead of error
        return jsonify({
            'evidence': get_fallback_evidence(evidence_type),
            'type': evidence_type,
            'success': True
        })
    finally:
        db_session.close()

@game_bp.route('/api/submit/<int:session_id>', methods=['POST'])
@login_required
def submit_answer(session_id):
    """Submit user's answer for the level with dynamic content."""
    db_session = get_db_session()
    try:
        data = request.get_json()
        user_answer = data.get('answer')
        time_taken = data.get('time_taken', 0)
        evidence_gathered = data.get('evidence_gathered', [])
        
        # Get game session
        game_session = db_session.query(GameSession).filter_by(
            id=session_id, user_id=session['user_id'], is_active=True
        ).first()
        
        if not game_session:
            return jsonify({'error': 'Invalid session'}), 404
        
        # Get level and generated content
        level = db_session.query(GameLevel).filter_by(id=game_session.level_id).first()
        if not level:
            return jsonify({'error': 'Level not found'}), 404
        
        # Parse session data to get generated content
        session_data = game_session.session_data
        if isinstance(session_data, str):
            try:
                session_data = json.loads(session_data)
            except:
                session_data = {}
        
        generated_content = session_data.get('generated_content', {})
        actual_is_fake = generated_content.get('is_fake', False)
        
        # Check if answer is correct (user answers True for real, False for fake)
        # So if news is fake (True) and user says fake (False), that's correct
        correct = (user_answer == False and actual_is_fake == True) or (user_answer == True and actual_is_fake == False)
        
        # Calculate score based on correctness, time, and evidence gathered
        base_score = 100 if correct else 0
        time_bonus = max(0, (level.time_limit - time_taken) // 10)  # Bonus for speed
        evidence_bonus = len(evidence_gathered) * 10  # Bonus for gathering evidence
        total_score = base_score + time_bonus + evidence_bonus
        
        # Update or create user progress
        progress = db_session.query(UserGameProgress).filter_by(
            user_id=session['user_id'], level_id=level.id
        ).first()
        
        if progress:
            progress.attempts += 1
            progress.last_attempt = datetime.utcnow()
            progress.user_answer = user_answer
            progress.time_taken = time_taken
            progress.evidence_gathered = json.dumps(evidence_gathered)
            
            # Only update completion and score if this is better than previous attempts
            if correct and (not progress.completed or total_score > progress.score):
                progress.completed = True
                progress.score = total_score
        else:
            progress = UserGameProgress(
                user_id=session['user_id'],
                level_id=level.id,
                completed=correct,
                score=total_score if correct else 0,
                time_taken=time_taken,
                attempts=1,
                user_answer=user_answer,
                evidence_gathered=json.dumps(evidence_gathered)
            )
            db_session.add(progress)
        
        # Mark session as inactive
        game_session.is_active = False
        
        db_session.commit()
        
        # Generate explanation based on the generated content
        if correct:
            explanation = f"Correct! This news story was {'fake' if actual_is_fake else 'real'}. Well done on your investigation!"
        else:
            truth = 'fake' if actual_is_fake else 'real'
            explanation = f"This news story was actually {truth}. Review the evidence more carefully next time."
        
        # Check if this unlocks the next level
        next_level_unlocked = False
        if correct and level.level_number < 10:
            next_level = db_session.query(GameLevel).filter_by(level_number=level.level_number + 1).first()
            if next_level:
                # Check if user has already completed or attempted this next level
                next_progress = db_session.query(UserGameProgress).filter_by(
                    user_id=session['user_id'], level_id=next_level.id
                ).first()
                if not next_progress:
                    next_level_unlocked = True
        
        return jsonify({
            'correct': correct,
            'score': total_score,
            'explanation': explanation,
            'level_completed': correct,
            'total_evidence': len(evidence_gathered),
            'next_level_unlocked': next_level_unlocked,
            'attempts': progress.attempts,
            'actual_answer': 'fake' if actual_is_fake else 'real'
        })
        
    except Exception as e:
        db_session.rollback()
        print(f"Error submitting answer: {e}")
        return jsonify({'error': 'Failed to submit answer'}), 500
    finally:
        db_session.close()

@game_bp.route('/generate-levels', methods=['POST'])
@login_required
def generate_levels():
    """Generate initial game level templates (no static content)."""
    db_session = get_db_session()
    try:
        # Check if levels already exist
        existing_levels = db_session.query(GameLevel).count()
        if existing_levels > 0:
            return jsonify({
                'success': False,
                'message': 'Game levels already exist. Delete existing levels first if you want to regenerate.'
            })
        
        # Define difficulty progression for 10 levels
        difficulty_progression = [
            'easy',    # Level 1
            'easy',    # Level 2
            'easy',    # Level 3
            'medium',  # Level 4
            'medium',  # Level 5
            'medium',  # Level 6
            'hard',    # Level 7
            'hard',    # Level 8
            'hard',    # Level 9
            'hard'     # Level 10
        ]
        
        levels_created = 0
        
        for i in range(1, 11):
            try:
                difficulty = difficulty_progression[i-1]
                print(f"Creating Level {i} template with difficulty: {difficulty}")
                
                # Create level template (NO static content - all content generated dynamically)
                level = GameLevel(
                    level_number=i,
                    title=f"Level {i}: {difficulty.title()} Challenge",
                    headline="Dynamic Content Generated on Each Play",  # Placeholder only
                    article_snippet="Fresh AI-generated content appears on every play session",  # Placeholder only
                    is_fake=False,  # Will be determined dynamically each time
                    difficulty=difficulty,
                    time_limit=600 if difficulty == 'easy' else 450 if difficulty == 'medium' else 300,
                    facebook_posts="[]",  # Empty - content generated dynamically
                    news_articles="[]",   # Empty - content generated dynamically
                    expert_opinions="[]"  # Empty - content generated dynamically
                )
                
                db_session.add(level)
                levels_created += 1
                print(f"Created Level {i} template for {difficulty} difficulty")
                
            except Exception as e:
                print(f"Error creating level {i}: {e}")
                continue
        
        if levels_created > 0:
            db_session.commit()
            return jsonify({
                'success': True,
                'message': f'Successfully created {levels_created} dynamic game level templates! Fresh content will be generated on every play.'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to create any level templates.'
            })
            
    except Exception as e:
        db_session.rollback()
        print(f"Error generating level templates: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating level templates. Please try again.'
        })
    finally:
        db_session.close()

def get_fallback_evidence(evidence_type):
    """Provide fallback evidence when database evidence is unavailable."""
    if evidence_type == 'facebook':
        return [
            {
                "author": "Manila Insider",
                "content": "BREAKING: Multiple sources confirm this story. Check the timeline of events - everything adds up perfectly. Government officials haven't denied it yet.",
                "likes": 1205,
                "shares": 487,
                "time": "2 hours ago",
                "verified": True,
                "supports_claim": True
            },
            {
                "author": "FactChecker_PH",
                "content": "🚨 RED FLAGS: Notice the lack of specific details, dates, and official statements. The photos being shared are from a different event last year. Always verify before sharing!",
                "likes": 892,
                "shares": 234,
                "time": "3 hours ago",
                "verified": True,
                "supports_claim": False
            },
            {
                "author": "Maria Santos",
                "content": "My cousin works in the government office mentioned. She says no such announcement was made internally. This seems suspicious.",
                "likes": 156,
                "shares": 45,
                "time": "4 hours ago",
                "verified": False,
                "supports_claim": False
            },
            {
                "author": "TruthSeeker2024",
                "content": "Finally! This is exactly what we needed. About time someone took action. The evidence is overwhelming - just look at all the reports coming out.",
                "likes": 2341,
                "shares": 1023,
                "time": "1 hour ago",
                "verified": False,
                "supports_claim": True
            }
        ]
    elif evidence_type == 'news':
        return [
            {
                "title": "Government Officials Deny Recent Claims Circulating Online",
                "source": "Philippine Daily Inquirer",
                "author": "Maria Garcia",
                "date": "2024-11-20",
                "excerpt": "Department spokesperson issued official statement categorically denying the allegations. 'No such policy was discussed or approved,' said Deputy Secretary Rodriguez. Timeline inconsistencies noted in viral claims.",
                "credibility_score": 9,
                "citations": 6,
                "supports_claim": False
            },
            {
                "title": "Local News Reports Confirm Political Development",
                "source": "Manila Bulletin",
                "author": "Unknown Reporter",
                "date": "2024-11-20",
                "excerpt": "Sources close to the administration confirm significant policy changes are being implemented. Details remain scarce but impact expected to be substantial across multiple sectors.",
                "credibility_score": 4,
                "citations": 1,
                "supports_claim": True
            },
            {
                "title": "Analysis: How Misinformation Spreads in Philippine Politics",
                "source": "Rappler",
                "author": "Dr. Ana Liza Reyes",
                "date": "2024-11-19",
                "excerpt": "Recent viral claims follow typical pattern of political misinformation: emotional language, lack of specifics, unverified sources. Experts warn against accepting unsubstantiated reports.",
                "credibility_score": 8,
                "citations": 12,
                "supports_claim": False
            },
            {
                "title": "Breaking: Major Policy Announcement Expected This Week",
                "source": "PolitikoNews",
                "author": "Staff Reporter",
                "date": "2024-11-18",
                "excerpt": "Administration insiders hint at significant announcements coming. While details remain confidential, sources suggest major policy shifts are imminent. Official confirmation pending.",
                "credibility_score": 5,
                "citations": 2,
                "supports_claim": True
            }
        ]
    elif evidence_type == 'experts':
        return [
            {
                "expert": "Dr. Robert Martinez",
                "credentials": "Political Science Professor",
                "quote": "The lack of official documentation and the timing of this claim raise serious red flags. Real policy changes follow established protocols with proper announcements through official channels.",
                "institution": "University of the Philippines",
                "supports_claim": False
            },
            {
                "expert": "Prof. Elena Reyes",
                "credentials": "Media Studies Expert",
                "quote": "This follows the classic pattern of misinformation: emotionally charged language, vague details, and reliance on unnamed sources. Critical analysis reveals multiple inconsistencies.",
                "institution": "Ateneo de Manila University",
                "supports_claim": False
            },
            {
                "expert": "Dr. Carlos Villanueva",
                "credentials": "Government Policy Analyst",
                "quote": "While the administration has been considering various policy options, the specific claims circulating online contain inaccuracies about procedures and timelines that wouldn't occur in legitimate policy development.",
                "institution": "De La Salle University",
                "supports_claim": False
            }
        ]
    return []