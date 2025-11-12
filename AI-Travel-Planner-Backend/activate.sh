#!/bin/bash
# Activate virtual environment and run the application

cd "$(dirname "$0")"
source venv/bin/activate
python run.py

