import auth
import models
from database import SessionLocal

def seed_host_user():
    db = SessionLocal()
    email = "codervar001@gmail.com"
    password = "password123"
    
    # Check if exists
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        print(f"User {email} already exists. Updating password...")
        existing.password = auth.get_password_hash(password)
        existing.role = "host"
    else:
        print(f"Creating user {email}...")
        new_user = models.User(
            email=email,
            password=auth.get_password_hash(password),
            role="host"
        )
        db.add(new_user)
        db.flush() # Get the user id
        existing = new_user

    # Ensure Host profile exists
    host = db.query(models.Host).filter(models.Host.user_id == existing.id).first()
    if not host:
        print(f"Creating host profile for {email}...")
        new_host = models.Host(
            user_id=existing.id,
            display_name="Demo Host"
        )
        db.add(new_host)    
    db.commit()
    db.close()
    print(f"Successfully seeded {email} with password: {password}")

if __name__ == "__main__":
    seed_host_user()
