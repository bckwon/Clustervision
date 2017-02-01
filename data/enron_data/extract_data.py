# Splits each email on double newlines.

import glob
import json
import numpy as np
import sklearn.feature_extraction
import string
from tqdm import tqdm

### DOWNLOAD
print 'First, you must download the Enron dataset from the link below:'
print 'http://www.cs.cmu.edu/~enron/enron_mail_20150507.tgz'

print 'Extract the archive into a folder named "maildir" in this folder.'
raw_input('Press [ENTER] when done:')

### EXTRACT


def sanitize(dirty_text):
    clean_text = ''
    for char in dirty_text:
        if char in string.printable:
            clean_text += char
        else:
            clean_text += ' '
    return clean_text

print 'Loading data'
blob_vec = []
descriptions = []
for filename in tqdm(glob.glob('maildir/*/*/*.')[::1000]):
    (_, username, folder, index) = filename.split('/')
    index = int(index[:-1]) # Remove the trailing period.
    with open(filename) as f:
        text = f.read()
    text = sanitize(text)
    for blob in text.split('\n\n'):
        d = {'username': username, 'folder': folder, 'index': index, 'text': blob[:1000]}
        blob_vec.append(blob)
        descriptions.append(d)

print 'Extracting BOW features'
model = sklearn.feature_extraction.text.CountVectorizer(max_features=100)
data = model.fit_transform(blob_vec)
data = data.toarray()

print 'Data dimensions:', data.shape

print 'Saving data'
with open('enron.json', 'wb') as f:
    json.dump(descriptions, f)

with open('enron.npy', 'wb') as f:
    np.save(f, data)
