import numpy as np
import sklearn.feature_extraction
import json

codes = dict()
codes_inv = []
X = []
prev_id = None
count = 0
patient = {'med_codes': [], 'medication_names': [], 'first_date': None, 'last_date': None}
patient_vec = []
with open('../sequence_data/raw_data/record-combined.csv') as f:
    for lines in f.readlines():
        (patient_id, date, medications) = lines.strip().split(',')
        if prev_id is None:
            prev_id = patient_id
            assert patient['first_date'] is None
            patient['first_date'] = date
        elif prev_id != patient_id:
            patient_vec.append(patient)
            patient = {'med_codes': [], 'medication_names': [], 'first_date': date, 'last_date': None}
        patient['last_date'] = date
        medications = medications.split(';')
        med_codes = []
        for med in medications:
            patient['medication_names'].append(med)
            if med not in codes:
                codes[med] = len(codes)
                codes_inv.append(med)
            med_codes.append(codes[med])

        patient['med_codes'].extend(med_codes) # Switch to "append()" if we want to group together all medications from the same visit
        # count += 1
        # if count > 100:
        #     break

patient_vec.append(patient)
with open('patient_vec.json', 'wb') as f:
    json.dump(patient_vec, f)

X = [' '.join(map(str, patient['med_codes'])) for patient in patient_vec]

vectorizer = sklearn.feature_extraction.text.CountVectorizer()
data = vectorizer.fit_transform(X)
data = data.toarray()

np.save('sequence_data.npy', data)
