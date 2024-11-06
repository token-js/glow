import json
from pathlib import Path
import uuid
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()

entities = [
  "CREDIT_CARD",
  "CRYPTO",
  "EMAIL_ADDRESS",
  "IBAN_CODE",
  "IP_ADDRESS",
  "PHONE_NUMBER",
  "MEDICAL_LICENSE",
  "US_BANK_NUMBER",
  "US_DRIVER_LICENSE",
  "US_ITIN",
  "US_PASSPORT",
  "US_SSN",
  "UK_NHS",
  "ES_NIF",
  "ES_NIE",
  "IT_FISCAL_CODE",
  "IT_DRIVER_LICENSE",
  "IT_VAT_CODE",
  "IT_PASSPORT",
  "IT_IDENTITY_CARD",
  "PL_PESEL",
  "SG_NRIC_FIN",
  "SG_UEN",
  "AU_ABN",
  "AU_ACN",
  "AU_TFN",
  "AU_MEDICARE",
  "IN_AADHAAR",
  "IN_VEHICLE_REGISTRATION",
  "IN_VOTER",
  "IN_PASSPORT",
  "FI_PERSONAL_IDENTITY_CODE"
]

raw_data_path = Path('pi-export.json')
output_path = Path('scripts/fine-tune/data/pi.jsonl')

data = json.loads(raw_data_path.read_text())

if 'user_data' in data and 'messages' in data['user_data']:
    messages = data['user_data']['messages']

    for message in messages:
        text = message['text']
        results = analyzer.analyze(text=text, entities=entities, language='en')
        if results:
          # TODO(docs): manually replace the sensitive data. if there's a significant amount of
          # sensitive data, consider automating the process.
          raise ValueError("Sensitive information detected in one or more messages.")

    with output_path.open('a') as output_file:
        data = {'id': str(uuid.uuid4()), 'messages': messages}
        json.dump(data, output_file)
        output_file.write('\n')
else:
    raise ValueError("Invalid data format in pi-export.json")
