import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime

from server.api.utils import time_ago

# Define the timezone to be used in tests
time_zone = 'America/New_York'

def test_tonight_between_8pm_and_11_59pm():
    # Previous time: October 1st, 8:30 PM EDT (October 2nd, 00:30 AM UTC)
    previous_time = datetime.fromisoformat('2023-10-02T00:30:00+00:00')
    # Current time: October 1st, 9:00 PM EDT (October 2nd, 01:00 AM UTC)
    current_time = datetime.fromisoformat('2023-10-02T01:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Tonight'

def test_this_evening_between_5pm_and_8pm_today():
    # Previous time: October 1st, 5:30 PM EDT (October 1st, 21:30 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T21:30:00+00:00')
    # Current time: October 1st, 6:00 PM EDT (October 1st, 22:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-01T22:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'This evening'

def test_this_afternoon_between_12pm_and_5pm_today():
    # Previous time: October 1st, 1:00 PM EDT (October 1st, 17:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T17:00:00+00:00')
    # Current time: October 1st, 3:00 PM EDT (October 1st, 19:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-01T19:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'This afternoon'

def test_this_morning_between_5am_and_12pm_today():
    # Previous time: October 1st, 9:00 AM EDT (October 1st, 13:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T13:00:00+00:00')
    # Current time: October 1st, 11:00 AM EDT (October 1st, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-01T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'This morning'

def test_last_night_between_8pm_yesterday_and_5am_today():
    # Previous time: October 1st, 12:00 AM EDT (October 1st, 04:00 AM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T04:00:00+00:00')
    # Current time: October 1st, 6:00 AM EDT (October 1st, 10:00 AM UTC)
    current_time = datetime.fromisoformat('2023-10-01T10:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Last night'

def test_yesterday_evening_between_5pm_and_8pm_yesterday():
    # Previous time: October 1st, 7:00 PM EDT (October 1st, 23:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T23:00:00+00:00')
    # Current time: October 2nd, 8:00 AM EDT (October 2nd, 12:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-02T12:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Yesterday evening'

def test_yesterday_afternoon_between_12pm_and_5pm_yesterday():
    # Previous time: October 1st, 3:00 PM EDT (October 1st, 19:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T19:00:00+00:00')
    # Current time: October 2nd, 10:00 PM EDT (October 3rd, 02:00 AM UTC)
    current_time = datetime.fromisoformat('2023-10-03T02:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Yesterday afternoon'

def test_yesterday_morning_between_5am_and_12pm_yesterday():
    # Previous time: October 1st, 9:00 AM EDT (October 1st, 13:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T13:00:00+00:00')
    # Current time: October 2nd, 11:00 AM EDT (October 2nd, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-02T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Yesterday morning'

def test_two_days_ago():
    # Previous time: October 1st, 11:00 AM EDT (October 1st, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-01T15:00:00+00:00')
    # Current time: October 3rd, 11:00 AM EDT (October 3rd, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-03T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Two days ago'

def test_a_few_days_ago_between_three_and_six_days():
    # Previous time: October 3rd, 11:00 AM EDT (October 3rd, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-03T15:00:00+00:00')
    # Current time: October 7th, 11:00 AM EDT (October 7th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-07T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'A few days ago'

def test_one_week_ago_between_7_and_10_5_days():
    # Previous time: October 2nd, 11:00 AM EDT (October 2nd, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-02T15:00:00+00:00')
    # Current time: October 9th, 11:00 AM EDT (October 9th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-09T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'One week ago'

def test_a_week_and_a_half_ago_between_10_5_and_14_days():
    # Previous time: October 4th, 11:00 AM EDT (October 4th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-04T15:00:00+00:00')
    # Current time: October 15th, 11:00 AM EDT (October 15th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-15T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'A week and a half ago'

def test_two_weeks_ago_between_14_and_20_days():
    # Previous time: October 5th, 11:00 AM EDT (October 5th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-05T15:00:00+00:00')
    # Current time: October 20th, 11:00 AM EDT (October 20th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-20T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Two weeks ago'

def test_three_weeks_ago_between_21_and_26_days():
    # Previous time: October 6th, 11:00 AM EDT (October 6th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-06T15:00:00+00:00')
    # Current time: October 27th, 11:00 AM EDT (October 27th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-10-27T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Three weeks ago'

def test_a_month_ago_between_27_and_44_days():
    # Previous time: October 10th, 11:00 AM EDT (October 10th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-10T15:00:00+00:00')
    # Current time: November 12th, 10:00 AM EST (November 12th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-11-12T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'A month ago'

def test_a_month_and_a_half_ago_between_45_and_59_days():
    # Previous time: October 15th, 11:00 AM EDT (October 15th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-15T15:00:00+00:00')
    # Current time: December 1st, 10:00 AM EST (December 1st, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-12-01T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'A month and a half ago'

def test_two_months_ago_between_60_and_89_days():
    # Previous time: October 15th, 11:00 AM EDT (October 15th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-15T15:00:00+00:00')
    # Current time: December 15th, 10:00 AM EST (December 15th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2023-12-15T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Two months ago'

def test_three_months_ago_between_90_and_119_days():
    # Previous time: October 15th, 11:00 AM EDT (October 15th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-15T15:00:00+00:00')
    # Current time: January 15th, 10:00 AM EST (January 15th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2024-01-15T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Three months ago'

def test_ten_months_ago_between_300_and_330_days():
    # Previous time: October 20th, 11:00 AM EDT (October 20th, 15:00 PM UTC)
    previous_time = datetime.fromisoformat('2023-10-20T15:00:00+00:00')
    # Current time: September 15th, 11:00 AM EDT (September 15th, 15:00 PM UTC)
    current_time = datetime.fromisoformat('2024-09-15T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'Ten months ago'

def test_a_year_ago_between_365_and_729_days():
    # Previous time: October 20th, 11:00 AM EDT (2023-10-20T15:00:00+00:00)
    previous_time = datetime.fromisoformat('2023-10-20T15:00:00+00:00')
    # Current time: October 20th, 11:00 AM EDT one year later
    current_time = datetime.fromisoformat('2024-10-20T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'A year ago'

def test_two_years_ago_730_days_and_beyond():
    # Previous time: October 20th, 11:00 AM EDT (2023-10-20T15:00:00+00:00)
    previous_time = datetime.fromisoformat('2023-10-20T15:00:00+00:00')
    # Current time: October 25th, 11:00 AM EDT two years later
    current_time = datetime.fromisoformat('2025-10-25T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == '2 years ago'

def test_boundary_of_last_night():
    # Both times exactly at 5:00 AM EDT (2023-10-02T09:00:00+00:00)
    previous_time = datetime.fromisoformat('2023-10-02T09:00:00+00:00')
    current_time = datetime.fromisoformat('2023-10-02T09:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result != 'Last night'

def test_future_dates_return_empty_string():
    # Previous time is in the future compared to current time
    previous_time = datetime.fromisoformat('2023-10-02T15:00:00+00:00')
    current_time = datetime.fromisoformat('2023-10-01T15:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == ''

def test_boundary_of_this_morning():
    # Both times exactly at 12:00 PM EDT (2023-10-01T16:00:00+00:00)
    previous_time = datetime.fromisoformat('2023-10-01T16:00:00+00:00')
    current_time = datetime.fromisoformat('2023-10-01T16:00:00+00:00')
    result = time_ago(current_time, previous_time, time_zone)
    assert result == 'This afternoon'
