class MemoryCalculator:
    def __init__(self):
        self.memory = 0
    def add(self, num):
        self.memory += num
    def recall(self):
        return self.memory