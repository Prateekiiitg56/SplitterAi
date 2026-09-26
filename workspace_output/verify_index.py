import os
import unittest
from html.parser import HTMLParser

class HeadingChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_heading = False
        self.heading_tag = None
        self.found_hello_world = False

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            self.in_heading = True
            self.heading_tag = tag

    def handle_endtag(self, tag):
        if tag.lower() in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            self.in_heading = False

    def handle_data(self, data):
        if self.in_heading and "Hello World" in data:
            self.found_hello_world = True

class TestIndexHTML(unittest.TestCase):
    def test_index_file_exists(self):
        self.assertTrue(os.path.exists("index.html"), "index.html does not exist in root directory")

    def test_heading_contains_hello_world(self):
        with open("index.html", "r", encoding="utf-8") as f:
            content = f.read()
        
        parser = HeadingChecker()
        parser.feed(content)
        self.assertTrue(parser.found_hello_world, "No heading tag containing 'Hello World' was found in index.html")

if __name__ == "__main__":
    unittest.main()
