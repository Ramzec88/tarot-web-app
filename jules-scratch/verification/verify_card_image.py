import os
import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath('index.html')
        page.goto(f'file://{file_path}')

        # Clear localStorage to ensure a fresh state for the test
        # This prevents the app from thinking the daily card has already been used.
        page.evaluate("localStorage.clear()")
        page.reload()

        # Wait for the main card element to be visible
        tarot_card = page.locator("#tarotCard")
        expect(tarot_card).to_be_visible(timeout=5000)

        # Click the card to flip it
        tarot_card.click()

        # Wait for the front of the card with the image to be visible
        card_front = page.locator(".card-front")
        expect(card_front).to_be_visible(timeout=2000)

        # The image itself
        card_image = page.locator("#cardImage")

        # We expect the `src` attribute to be populated with a real S3 URL.
        # We'll use a regex to check for the correct URL structure.
        # The timeout is generous because the script fetches and checks multiple URLs.
        s3_url_pattern = re.compile(r"https://750740e55ba3-diskn8n\.s3\.ru1\.storage\.beget\.cloud/tarot_cards/pr/.*")
        expect(card_image).to_have_attribute("src", s3_url_pattern, timeout=20000)

        # Set a viewport that's representative of a mobile device
        page.set_viewport_size({"width": 480, "height": 800})

        # Wait a moment for the image to fully render from the network
        page.wait_for_timeout(2000)

        screenshot_path = 'jules-scratch/verification/card_image_verification.png'
        page.screenshot(path=screenshot_path)

        browser.close()
        print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    run()
