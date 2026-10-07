from app.database.database import SessionLocal
from app.database.models import RefreshToken
from app.utils import utc_now


def delete_expired_refresh_tokens():

    db = SessionLocal()

    try:

        deleted_count = (
            db.query(RefreshToken)
            .filter(RefreshToken.expires_at <= utc_now())
            .delete(synchronize_session=False)
        )

        db.commit()

        print(f"Deleted {deleted_count} expired refresh tokens.")

    except Exception as e:
        db.rollback()
        print(f"Error deleting expired refresh tokens: {e}")

    finally:
        db.close()