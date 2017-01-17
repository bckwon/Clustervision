"""
Cluster Analysis
Created on 01/17/2017
"""
import os
from flask import Flask, request, redirect, url_for, send_from_directory, render_template
from flask import jsonify
from werkzeug import secure_filename
import subprocess
import csv
import json
import datetime
import scipy.cluster.hierarchy as hcluster
import numpy
from sklearn.feature_extraction.text import CountVectorizer
from sklearn import metrics


app = Flask(__name__)

@app.route('/')
def index():
	data = json.dumps({'name': 'sample', 'data': [0,1,2,3]})
	return render_template('index.html',data=data)


if __name__ == '__main__':
    app.run(debug=True)