class ConversationState:
    def __init__(self):
        self.destination = None
        self.start_date = None
        self.num_days = None
        self.budget = None
        self.departure_city = None
        self.trip_type = None
        self.context = []  # chat history

    def is_complete(self):
        return all([
            self.destination,
            self.start_date,
            self.num_days,
            self.budget,
            self.departure_city,
            self.trip_type
        ])

    def reset(self):
        """Reset all values and clear context."""
        self.destination = None
        self.start_date = None
        self.num_days = None
        self.budget = None
        self.departure_city = None
        self.trip_type = None
        self.context.clear()
        self.last_asked_field = None

    def to_dict(self):
        return {
            "destination": self.destination,
            "start_date": self.start_date,
            "num_days": self.num_days,
            "budget": self.budget,
            "departure_city": self.departure_city,
            "trip_type": self.trip_type
        }
