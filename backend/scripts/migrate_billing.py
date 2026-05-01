import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "edgecloud.db")

print(f"Migrating database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add columns ignoring errors if they already exist
    columns = [
        ("deployment_id", "VARCHAR"),
        ("node_id", "VARCHAR"),
        ("duration_seconds", "INTEGER"),
        ("price_per_minute", "FLOAT"),
        ("balance_after", "FLOAT")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE credit_transactions ADD COLUMN {col_name} {col_type};")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists. Skipping.")
            else:
                raise e
                
    conn.commit()
    print("Migration successful.")
except Exception as e:
    print(f"Migration failed: {e}")
finally:
    if 'conn' in locals():
        conn.close()
