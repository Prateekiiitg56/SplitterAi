from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager

drivers = [
    webdriver.Chrome(ChromeDriverManager().install()),
    webdriver.Firefox(),
    webdriver.Edge()
]

test_url = "https://example.com"

for driver in drivers:
    driver.get(test_url)
    # Add assertions to verify page content and responsiveness
    driver.quit()