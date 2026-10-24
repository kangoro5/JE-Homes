class Staff:
    def __init__(self):
        self.staff_id = ""
        self.full_name = ""
        self.base_salary = 0
        self.performance_rating = 0
        self.punctuality_score = 0
        self.performance_bonus = 0
        self.punctuality_bonus = 0
        self.team_leadership_bonus = 0

    def capture(self):
        self.staff_id = input("Enter your staff id: ")
        self.full_name = input("Enter your name: ")
        self.base_salary = int(input("Enter your salary: "))
        self.performance_rating = int(input("Enter your performance rating: "))
        self.punctuality_score = int(input("Enter your punctuality score: "))

    def calculate_performance_bonus(self):
        if self.performance_rating >= 90:
            self.performance_bonus = self.base_salary * 0.15
        elif 80 <= self.performance_rating < 90:
            self.performance_bonus = self.base_salary * 0.08
        elif 70 <= self.performance_rating < 80:
            self.performance_bonus = self.base_salary * 0.04
        else:
            self.performance_bonus = 0

    def calculate_punctuality_bonus(self):
        if self.punctuality_score >= 96:
            self.punctuality_bonus = 4000
        elif self.punctuality_score >= 90:
            self.punctuality_bonus = 1500
        else:
            self.punctuality_bonus = 0

    def calculate_team_leadership_bonus(self):
        self.team_leadership_bonus = 0

    def compute_total_bonus(self):
        self.calculate_performance_bonus()
        self.calculate_punctuality_bonus()
        self.calculate_team_leadership_bonus()
        return self.performance_bonus + self.punctuality_bonus + self.team_leadership_bonus


class Supervision(Staff):
    def display(self):
        print("\nStaff details")
        print("id", self.staff_id)
        print("name", self.full_name)
        print("salary", self.base_salary)
        print("performance rating", self.performance_rating)
        print("punctuality rating", self.punctuality_score)
        print("performance bonus", self.performance_bonus)
        print("punctuality bonus", self.punctuality_bonus)
        print("total bonus", self.compute_total_bonus())


if __name__ == "__main__":
    s1 = Supervision()
    s1.capture()
    s1.compute_total_bonus()
    s1.display()