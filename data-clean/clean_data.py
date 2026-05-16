import pandas as pd
import json
from collections import Counter
import ast

def clean_spaces(text):
    """Remove multiple spaces and trim"""
    if pd.isna(text) or text == '':
        return ''
    return ' '.join(str(text).split())

def parse_war(war_str):
    """Parse war string and return cleaned war name"""
    if pd.isna(war_str) or not str(war_str).strip():
        return ''
    try:
        wars_list = ast.literal_eval(str(war_str))
        if isinstance(wars_list, list):
            # Clean and filter out invalid entries
            cleaned = []
            for w in wars_list:
                w_clean = clean_spaces(w)
                # Skip entries starting with '(' (incomplete names)
                if w_clean and not w_clean.startswith('('):
                    cleaned.append(w_clean)
            return ', '.join(cleaned) if cleaned else ''
    except:
        pass
    return clean_spaces(war_str)

# Read the CSV file
df = pd.read_csv('raw_war_data.csv', encoding='cp1252', on_bad_lines='skip')

# Drop the first column (row numbers)
df = df.iloc[:, 1:]

# Remove rows where Battle is empty (these are placeholder rows)
df = df[df['Battle'].notna() & (df['Battle'] != '')]

# Initialize collections
countries = set()
wars = set()
theatres = set()
participants_list = []

cleaned_data = []

for _, row in df.iterrows():
    # Parse participants
    participants = []
    if pd.notna(row.get('Participants')) and str(row['Participants']).strip():
        try:
            participants = ast.literal_eval(str(row['Participants']))
            if isinstance(participants, list):
                # Clean each participant name
                participants = [clean_spaces(p) for p in participants if clean_spaces(p)]
                participants_list.extend(participants)
                countries.update(participants)
        except:
            pass

    # Parse war using helper function
    war_str = str(row.get('War', '')) if pd.notna(row.get('War')) else ''
    war_cleaned = parse_war(war_str)

    # Add to wars set (individual wars, not combined)
    if war_cleaned:
        individual_wars = [w.strip() for w in war_cleaned.split(',')]
        for w in individual_wars:
            if w and not w.startswith('('):
                wars.add(w)

    # Parse theatre
    theatre_cleaned = clean_spaces(row.get('Theatre'))
    if theatre_cleaned:
        theatres.add(theatre_cleaned)

    # Convert massacre to boolean
    massacre_raw = clean_spaces(row.get('Massacre'))
    massacre = False if massacre_raw == 'No' else bool(massacre_raw)

    entry = {
        'id': clean_spaces(row.get('ID')),
        'country': clean_spaces(row.get('Country')),
        'battle': clean_spaces(row.get('Battle')),
        'year': clean_spaces(row.get('Year')),
        'latitude': clean_spaces(row.get('Latitude')),
        'longitude': clean_spaces(row.get('Longitude')),
        'participants': participants if participants else [],
        'war': war_cleaned,
        'winner': clean_spaces(row.get('Winner')),
        'loser': clean_spaces(row.get('Loser')),
        'scale': clean_spaces(row.get('Lehmann Zhukov Scale')),
        'theatre': theatre_cleaned,
        'massacre': massacre
    }
    cleaned_data.append(entry)

# Count participants
participant_counts = Counter(participants_list)

# Create output structure
output = {
    'statistics': {
        'totalBattles': len(cleaned_data),
        'totalUniqueCountries': len(countries),
        'totalUniqueWars': len(wars),
        'totalUniqueTheatres': len(theatres),
        'countries': sorted(list(countries)),
        'wars': sorted(list(wars)),
        'theatres': sorted(list(theatres)),
        'topParticipants': dict(participant_counts.most_common(20))
    },
    'battles': cleaned_data
}

# Write to JSON file
with open('cleaned_data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Cleaned {len(cleaned_data)} battle records")
print(f"Found {len(countries)} unique countries")
print(f"Found {len(wars)} unique wars")
print(f"Output written to cleaned_data.json")
