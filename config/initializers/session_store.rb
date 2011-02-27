# Be sure to restart your server when you modify this file.

# Your secret key for verifying cookie session data integrity.
# If you change this key, all old sessions will become invalid!
# Make sure the secret is at least 30 characters and all random, 
# no regular words or you'll be exposed to dictionary attacks.
ActionController::Base.session = {
  :key         => '_Churros_session',
  :secret      => '8e7a510748ac80cb0c1b11184bb990d9175969f6f29efe2f3eb05c5e66ee4c683bdb32cd9e42ea076715a2f4803ee1f812af22d13125d4fecf9538e2607a5f42'
}

# Use the database for sessions instead of the cookie-based default,
# which shouldn't be used to store highly confidential information
# (create the session table with "rake db:sessions:create")
# ActionController::Base.session_store = :active_record_store
