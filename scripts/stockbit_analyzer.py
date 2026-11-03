import time
import json
import re
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class StockbitAnalyzer:
    def __init__(self, headless=True):
        self.options = Options()
        if headless:
            self.options.add_argument("--headless")
        self.options.add_argument("--disable-gpu")
        self.options.add_argument("--no-sandbox")
        self.options.add_argument("--disable-dev-shm-usage")
        self.options.add_argument("--disable-blink-features=AutomationControlled")
        self.options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
        
        # Slang Lexicon (Indonesian Stock Community)
        self.pos_words = [
            'serok', 'haka', 'bullish', 'to the moon', 'tp', 'akumulasi', 'ara', 'bandar', 
            'borong', 'mantap', 'gaskeun', 'cuan', 'pesta', 'sedekah', 'cakep', 'fly', 'rebound'
        ]
        self.neg_words = [
            'guyur', 'nyangkut', 'cutloss', 'bocor', 'bearish', 'arb', 'sangkut', 'dump',
            'ritel', 'longsor', 'boncos', 'berdarah', 'scam', 'waspada', 'hati-hati'
        ]

    def clean_text(self, text):
        # Remove mentions, hashtags, links, and extras
        text = text.lower()
        text = re.sub(r'http\S+', '', text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#\w+', '', text)
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def get_market_start_time(self):
        # Jakarta is UTC+7. 09:00 WIB = 02:00 UTC
        now = datetime.utcnow() + timedelta(hours=7)
        market_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
        
        # If today is weekend or before 9AM, we use last trading day
        if now.weekday() >= 5 or now.hour < 9:
            # Simple logic: go back 1 day until it's a weekday
            while market_start.weekday() >= 5 or market_start > now:
                market_start -= timedelta(days=1)
                
        return market_start

    def scrape_stockbit_stream(self, ticker):
        driver = webdriver.Chrome(options=self.options)
        url = f"https://stockbit.com/symbol/{ticker}"
        print(f"SCRAPING: Starting analysis for {ticker} at {url}...")
        
        try:
            driver.get(url)
            wait = WebDriverWait(driver, 15)
            
            # Wait for stream container
            wait.until(EC.presence_of_element_located((By.CLASS_NAME, "stream-text-container")))
            
            market_start = self.get_market_start_time()
            posts = []
            reached_cutoff = False
            
            while not reached_cutoff:
                # Scroll down to load more
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2) # dynamic sleep
                
                # Fetch currently loaded posts
                elements = driver.find_elements(By.CLASS_NAME, "stream-text-container")
                time_elements = driver.find_elements(By.CLASS_NAME, "stream-date") # Assumption based on UI
                
                for i, el in enumerate(elements):
                    text = el.text
                    # Parse time (Stockbit usually shows "2h ago" or specific date)
                    # This logic needs robust parser for real scraping
                    # For demo purposes, we process current batch
                    posts.append(text)
                
                # Exit condition: if we have enough or simulated cutoff
                if len(posts) > 50:
                    reached_cutoff = True
            
            return self.process_sentiment(posts)
            
        except Exception as e:
            print(f"ERROR: {str(e)}")
            return {"error": str(e)}
        finally:
            driver.quit()

    def process_sentiment(self, posts):
        total_score = 0
        valid_chatter = []
        
        for post in posts:
            cleaned = self.clean_text(post)
            score = 0
            for p in self.pos_words:
                if p in cleaned: score += 1
            for n in self.neg_words:
                if n in cleaned: score -= 1
            
            valid_chatter.append({
                "original": post[:200],
                "score": score
            })
            total_score += score
            
        avg_score = total_score / len(posts) if posts else 0
        # Normalize to -1 to 1
        normalized_score = max(-1, min(1, avg_score))
        
        # Sort for top signals
        valid_chatter.sort(key=lambda x: abs(x['score']), reverse=True)
        
        return {
            "Sentiment_Score": normalized_score,
            "Total_Chatter": len(posts),
            "Top_Signals": valid_chatter[:3],
            "Timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Example Usage
    analyzer = StockbitAnalyzer(headless=True)
    # result = analyzer.scrape_stockbit_stream("BBCA")
    # print(json.dumps(result, indent=2))
    print("Stockbit Sentiment Module Initialized. Ready for integration.")
