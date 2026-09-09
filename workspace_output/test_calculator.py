import unittest
from calculator import Calculator

class TestCalculator(unittest.TestCase):
    def test_trigonometric_functions(self):
        calculator = Calculator()
        self.assertAlmostEqual(calculator.sin(0), 0)
        self.assertAlmostEqual(calculator.cos(0), 1)
        self.assertAlmostEqual(calculator.tan(0), 0)

    def test_exponential_functions(self):
        calculator = Calculator()
        self.assertAlmostEqual(calculator.exp(0), 1)
        self.assertAlmostEqual(calculator.exp(1), 2.71828, places=5)

    def test_logarithmic_functions(self):
        calculator = Calculator()
        self.assertAlmostEqual(calculator.log(1), 0)
        self.assertAlmostEqual(calculator.log(10), 1)

    def test_memory_storage(self):
        calculator = Calculator()
        calculator.store(10)
        self.assertEqual(calculator.recall(), 10)
