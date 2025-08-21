import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for all console events and print them
        print("--- Setting up console listener ---")
        # Corrected: msg.text is a property, not a method.
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.type} >> {msg.text}"))
        print("--- Console listener set up ---")

        file_path = os.path.abspath('index.html')
        print(f"--- Navigating to {file_path} ---")
        page.goto(f'file://{file_path}')

        print("--- Clearing localStorage and reloading ---")
        page.evaluate("localStorage.clear()")
        page.reload()

        print("--- Waiting for page to be ready (5 seconds) ---")
        page.wait_for_timeout(5000)

        print("--- Finding card element ---")
        tarot_card = page.locator("#tarotCard")

        print("--- Clicking card ---")
        tarot_card.click()

        print("--- Waiting for potential errors (5 seconds) ---")
        page.wait_for_timeout(5000)

        print("--- Debug script finished ---")
        browser.close()

if __name__ == "__main__":
    run()
