# Configuration File

DB_FILENAME = 'db.lmdb'         # Database filename
NUM_CHOICES = 10                # How many clusterings to show the user (including the previous best)
L_INITIAL = 0.5                 # Initial value for MMR parameter lambda
L_INCREMENT = 0.1               # L increases by this amount after each round.
MIN_CLUSTERING_DIST = 0.01      # Minimum distance between any two clusterings shown to the user. 
NUM_RANDOM_WEIGHTINGS = 3       # Number of random weightings to try (in addition to the original weighting)
RANDOM_WEIGHTING_ALPHA = 0.3    # Parameter for Dirichlet distribution, used for randomly weighting the data
PARELLEL = True                 # Compute the clusterings in parallel?


