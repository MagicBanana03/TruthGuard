import os
import json
import random
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class GameContentGenerator:
    def __init__(self):
        """Initialize the game content generator with AI model."""
        api_key = os.getenv('GAME_API_KEY') or os.getenv('API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            print("Warning: No API key found. Using fallback content generation.")
            self.model = None

    def generate_level_content(self, level_number, difficulty='medium'):
        """Generate complete level content including headline, evidence, and metadata."""
        if not self.model:
            return self._get_fallback_content(level_number, difficulty)
            
        try:
            # Determine if this level should be fake or real
            is_fake = random.choice([True, False])
            
            # Adjust complexity based on difficulty
            complexity_instructions = self._get_complexity_instructions(difficulty)
            
            prompt = f"""
            Create a mystery-solving game level for fake news detection.
            Level: {level_number}, Difficulty: {difficulty}
            
            Generate a {'FAKE' if is_fake else 'REAL'} news scenario about Philippine politics.
            
            {complexity_instructions}
            
            Requirements:
            1. A compelling headline about Philippine politics
            2. A 2-3 sentence article snippet
            3. 4 Facebook posts with evidence (mix of supporting/contradicting)
            4. 4 news articles with varying credibility scores
            5. 3 expert opinions with analytical insights
            
            Include specific details for cross-referencing:
            - Dates and timelines that either match or conflict
            - Official vs unofficial sources
            - Specific names, positions, institutions
            - Credibility indicators (verification badges, source reputation)
            - Evidence that requires analysis to determine authenticity
            
            Format as JSON:
            {{
                "headline": "Specific headline with verifiable elements",
                "article_snippet": "Brief article with specific details for fact-checking",
                "is_fake": {str(is_fake).lower()},
                "facebook_posts": [
                    {{
                        "author": "Account name",
                        "content": "Post with specific details/dates/claims for cross-referencing",
                        "likes": 125,
                        "shares": 23,
                        "time": "2 hours ago",
                        "verified": true/false,
                        "supports_claim": true/false
                    }}
                ],
                "news_articles": [
                    {{
                        "title": "Article title with specific angle",
                        "source": "News outlet (vary credibility based on difficulty)",
                        "author": "Reporter name",
                        "date": "2024-11-20",
                        "excerpt": "Excerpt that confirms or contradicts with specific evidence",
                        "credibility_score": 1-10,
                        "citations": 1-15,
                        "supports_claim": true/false
                    }}
                ],
                "expert_opinions": [
                    {{
                        "expert": "Dr. Expert Name",
                        "credentials": "Specific credentials",
                        "quote": "Analysis pointing to authenticity indicators or red flags",
                        "institution": "Institution name",
                        "supports_claim": true/false
                    }}
                ]
            }}
            
            Make evidence require careful analysis of:
            - Timeline consistency
            - Source credibility analysis
            - Official vs unofficial verification
            - Factual detail cross-checking
            - Expert analysis of authenticity markers
            """
            
            response = self.model.generate_content(prompt)
            content_text = response.text.strip()
            
            # Clean up the response to ensure it's valid JSON
            if content_text.startswith('```json'):
                content_text = content_text[7:]
            if content_text.endswith('```'):
                content_text = content_text[:-3]
            
            content = json.loads(content_text)
            
            # Validate and set defaults
            content.setdefault('headline', f'Breaking News Story #{level_number}')
            content.setdefault('article_snippet', 'Political development under investigation.')
            content.setdefault('is_fake', is_fake)
            content.setdefault('facebook_posts', [])
            content.setdefault('news_articles', [])
            content.setdefault('expert_opinions', [])
            
            # Add metadata
            content['difficulty'] = difficulty
            content['time_limit'] = self._get_time_limit(difficulty)
            
            return content
            
        except Exception as e:
            print(f"Error generating content for level {level_number}: {e}")
            return self._get_fallback_content(level_number, difficulty)

    def _get_complexity_instructions(self, difficulty):
        """Get complexity instructions based on difficulty level."""
        if difficulty == 'easy':
            return """
            EASY LEVEL - Clear indicators:
            - Make authenticity relatively obvious through clear contradictions
            - Include obvious red flags (fake sources, impossible dates, clear inconsistencies)
            - Have most evidence point in the same direction
            - Use well-known sources with clear credibility indicators
            - Include obvious verification markers or their absence
            """
        elif difficulty == 'medium':
            return """
            MEDIUM LEVEL - Mixed signals:
            - Create more subtle inconsistencies requiring careful analysis
            - Mix high and low credibility sources evenly
            - Include conflicting evidence that requires cross-referencing
            - Use some ambiguous sources that need deeper investigation
            - Require analysis of multiple evidence types to reach conclusion
            """
        else:  # hard
            return """
            HARD LEVEL - Sophisticated deception:
            - Create very subtle inconsistencies requiring expert-level analysis
            - Use mostly credible-looking sources with minor red flags
            - Include sophisticated misinformation techniques
            - Require deep cross-referencing of dates, names, and institutions
            - Make the truth discoverable only through careful expert opinion analysis
            - Include convincing but fabricated evidence
            """

    def _get_time_limit(self, difficulty):
        """Get time limit based on difficulty."""
        time_limits = {
            'easy': 600,    # 10 minutes
            'medium': 450,  # 7.5 minutes
            'hard': 300     # 5 minutes
        }
        return time_limits.get(difficulty, 450)

    def _get_fallback_content(self, level_number, difficulty='medium'):
        """Fallback content when AI is unavailable."""
        # Create different scenarios based on difficulty
        if difficulty == 'easy':
            scenarios = [
                {
                    "headline": "President Marcos Announces Free WiFi in All Public Schools Starting January 2025",
                    "article_snippet": "In a televised address, President Marcos announced that all public schools will receive free high-speed internet by January 2025. The Department of Education confirmed the ₱50 billion budget allocation for the nationwide connectivity program.",
                    "is_fake": False,
                    "facebook_posts": [
                        {
                            "author": "Department of Education Philippines",
                            "content": "📢 OFFICIAL: Free WiFi program for all public schools confirmed! Implementation starts January 2025. This will benefit over 47,000 schools nationwide. #EducationFirst",
                            "likes": 5234,
                            "shares": 1876,
                            "time": "2 hours ago",
                            "verified": True,
                            "supports_claim": True
                        },
                        {
                            "author": "Teacher Maria Santos",
                            "content": "Finally! Our students will have better access to online resources. This is a game-changer for rural schools like ours.",
                            "likes": 432,
                            "shares": 89,
                            "time": "3 hours ago",
                            "verified": False,
                            "supports_claim": True
                        },
                        {
                            "author": "Budget Watch PH",
                            "content": "✅ VERIFIED: ₱50B allocation for school WiFi confirmed in 2025 budget documents. Timeline and funding are accurate.",
                            "likes": 1234,
                            "shares": 567,
                            "time": "1 hour ago",
                            "verified": True,
                            "supports_claim": True
                        },
                        {
                            "author": "Education Advocate",
                            "content": "This is exactly what our education system needs. Proper funding and clear implementation timeline.",
                            "likes": 678,
                            "shares": 123,
                            "time": "4 hours ago",
                            "verified": False,
                            "supports_claim": True
                        }
                    ],
                    "news_articles": [
                        {
                            "title": "DepEd Confirms ₱50B WiFi Program for Public Schools",
                            "source": "Philippine Daily Inquirer",
                            "author": "Education Reporter",
                            "date": "2024-11-20",
                            "excerpt": "Education Secretary confirms implementation of nationwide school WiFi program with clear budget allocation and timeline.",
                            "credibility_score": 9,
                            "citations": 8,
                            "supports_claim": True
                        },
                        {
                            "title": "Tech Companies Welcome School Connectivity Initiative",
                            "source": "BusinessWorld",
                            "author": "Tech Reporter",
                            "date": "2024-11-20",
                            "excerpt": "Major telecommunications companies express support for government's school WiFi program, citing readiness to participate in implementation.",
                            "credibility_score": 8,
                            "citations": 5,
                            "supports_claim": True
                        }
                    ],
                    "expert_opinions": [
                        {
                            "expert": "Dr. Elena Rodriguez",
                            "credentials": "Education Technology Expert",
                            "quote": "This program addresses a critical need in Philippine education. The timeline and budget allocation appear realistic and achievable.",
                            "institution": "University of the Philippines",
                            "supports_claim": True
                        }
                    ]
                }
            ]
        elif difficulty == 'medium':
            scenarios = [
                {
                    "headline": "Congress Passes Emergency Law Extending Presidential Term Limits",
                    "article_snippet": "In a surprise midnight session, Congress allegedly passed Resolution 2024-45 extending presidential term limits from 6 to 8 years. The measure reportedly received unanimous support from both houses of Congress.",
                    "is_fake": True,
                    "facebook_posts": [
                        {
                            "author": "Manila Political Updates",
                            "content": "BREAKING: Congress passes Resolution 2024-45 extending presidential terms to 8 years. Voting was 200-0 in favor. Historic decision! #Politics",
                            "likes": 3456,
                            "shares": 2134,
                            "time": "1 hour ago",
                            "verified": False,
                            "supports_claim": True
                        },
                        {
                            "author": "Senator Rodriguez Official",
                            "content": "No such resolution was passed. I was present at all sessions today. This is misinformation. Congress cannot unilaterally change constitutional provisions.",
                            "likes": 2341,
                            "shares": 1876,
                            "time": "30 minutes ago",
                            "verified": True,
                            "supports_claim": False
                        }
                    ],
                    "news_articles": [
                        {
                            "title": "Senate Denies Passing Term Extension Resolution",
                            "source": "GMA News",
                            "author": "Political Reporter",
                            "date": "2024-11-20",
                            "excerpt": "Senate President categorically denies any resolution extending presidential terms was passed or even discussed in Congress.",
                            "credibility_score": 9,
                            "citations": 6,
                            "supports_claim": False
                        }
                    ],
                    "expert_opinions": [
                        {
                            "expert": "Prof. Constitutional Law Expert",
                            "credentials": "Constitutional Law Professor",
                            "quote": "Term limits are constitutional provisions that cannot be changed through simple resolutions. This would require constitutional amendment.",
                            "institution": "Ateneo de Manila University",
                            "supports_claim": False
                        }
                    ]
                }
            ]
        else:  # hard
            scenarios = [
                {
                    "headline": "Supreme Court Chief Justice Announces Retirement Effective December 2024",
                    "article_snippet": "Chief Justice Maria Lourdes Sereno announced her retirement from the Supreme Court effective December 15, 2024, citing personal reasons. The announcement came during a private court session earlier today.",
                    "is_fake": True,  # Sophisticated fake - Sereno was already removed in 2018
                    "facebook_posts": [
                        {
                            "author": "Supreme Court PH",
                            "content": "Chief Justice Sereno announces retirement effective December 15, 2024. Transition process for new Chief Justice selection will begin immediately.",
                            "likes": 8765,
                            "shares": 4321,
                            "time": "2 hours ago",
                            "verified": True,
                            "supports_claim": True
                        },
                        {
                            "author": "Legal News Network",
                            "content": "🚨 Wait - isn't Chief Justice Sereno no longer in office? She was removed in 2018. Current Chief Justice is Alexander Gesmundo. Something's not right here.",
                            "likes": 2134,
                            "shares": 1567,
                            "time": "1 hour ago",
                            "verified": True,
                            "supports_claim": False
                        }
                    ],
                    "news_articles": [
                        {
                            "title": "Current Chief Justice Gesmundo Continues Court Duties",
                            "source": "Manila Bulletin",
                            "author": "Court Reporter",
                            "date": "2024-11-20",
                            "excerpt": "Chief Justice Alexander Gesmundo presided over court session today. No announcements regarding retirement made by current court leadership.",
                            "credibility_score": 8,
                            "citations": 4,
                            "supports_claim": False
                        }
                    ],
                    "expert_opinions": [
                        {
                            "expert": "Dr. Legal Historian",
                            "credentials": "Supreme Court History Expert",
                            "quote": "Maria Lourdes Sereno was removed from office in 2018 via quo warranto proceedings. She cannot announce retirement from a position she no longer holds.",
                            "institution": "University of Santo Tomas",
                            "supports_claim": False
                        }
                    ]
                }
            ]
        
        # Select appropriate scenario based on level and difficulty
        content = scenarios[level_number % len(scenarios)].copy()
        content['difficulty'] = difficulty
        content['time_limit'] = self._get_time_limit(difficulty)
        return content

# Initialize the content generator
content_generator = GameContentGenerator()
