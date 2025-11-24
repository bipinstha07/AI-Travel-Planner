from serpapi import GoogleSearch
from dotenv import load_dotenv
import os

load_dotenv()
SERP_API_KEY = os.getenv("Serp_API")


def get_hotels(destination: str, check_in: str, check_out: str, adults: int = 2, currency: str = "USD"):
    """
    Fetch top 5 hotel results using SerpAPI Google Hotels.
    Returns list of hotels with:
      - name
      - description
      - price_per_night
      - link
      - hotel_class
      - images (list of thumbnail + original_image)
    """

    params = {
        "engine": "google_hotels",
        "q": destination,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "adults": str(adults),
        "currency": currency,
        "gl": "us",
        "hl": "en",
        "api_key": SERP_API_KEY
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()

        # Prefer sponsored 'ads' first, else use organic 'properties'
        hotels_data = results.get("ads", []) or results.get("properties", [])

        hotels_list = []
        for hotel in hotels_data[:5]:
            # Extract images safely
            images = []
            for img in hotel.get("images", []):
                images.append({
                    "thumbnail": img.get("thumbnail"),
                    "original_image": img.get("original_image")
                })
 
            # Extract main info
            hotel_info = {
                "name": hotel.get("name"),
                "description": hotel.get("description"),
                "price_per_night": hotel.get("price") or hotel.get("rate_per_night", {}).get("lowest"),
                "link": hotel.get("link"),
                "hotel_class": hotel.get("extracted_hotel_class") or hotel.get("hotel_class"),
                "images": images
            }
            
            hotels_list.append(hotel_info)

        return hotels_list

    except Exception as e:
        print(f"❌ Error fetching hotels: {e}")
        return []


# Example usage
if __name__ == "__main__":
    hotels = get_hotels("Bali Resorts", "2025-11-09", "2025-11-10")
    for idx, h in enumerate(hotels, 1):
        print(f"\n🏨 {idx}. {h['name']}")
        print(f"   💰 {h['price_per_night']} | ⭐ {h['hotel_class']}")
        print(f"   🔗 {h['link']}")
        if h.get("images"):
            print(f"   🖼️ Image Count: {len(h['images'])}")
            print(f"   First Thumbnail: {h['images'][0]['thumbnail']}")
