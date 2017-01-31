# Configuration File

DB_FILENAME = 'db.lmdb'         # Database filename
LMDB_MAP_SIZE = 1e10            # Maximum size of the map file
NUM_CHOICES = 10                # How many clusterings to show the user (including the previous best)
L_INITIAL = 0.5                 # Initial value for MMR parameter lambda
L_INCREMENT = 0.1               # L increases by this amount after each round.
MIN_CLUSTERING_DIST = 0.01      # Minimum distance between any two clusterings shown to the user. 
NUM_RANDOM_WEIGHTINGS = 3       # Number of random weightings to try (in addition to the original weighting)
RANDOM_WEIGHTING_ALPHA = 0.3    # Parameter for Dirichlet distribution, used for randomly weighting the data. Increasing this value will lead to smoother weights. Decreasing this value will yield sparser weights.
PARELLEL = False                # Compute the clusterings in parallel?
KEY_NUM_DIGITS = 14             # Number of digits of precision to use for the clustering key hash. Thus should be less than 16, which is the maximum number of digits JS will parse accurately before rounding (http://stackoverflow.com/questions/307179/what-is-javascripts-highest-integer-value-that-a-number-can-go-to-without-losin).


