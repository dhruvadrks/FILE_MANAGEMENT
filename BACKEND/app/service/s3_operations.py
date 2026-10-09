from app.service.s3_client import s3,BUCKET_NAME
from botocore.exceptions import ClientError

def upload_to_s3(user_id,file,file_id):
    s3_key = f"user_{user_id}/file_{file_id}"

    try:
        file.file.seek(0)

        s3.upload_fileobj(
            file.file,
            BUCKET_NAME,
            s3_key
        )

        return s3_key

    except ClientError as e:
        raise 

def get_file_from_s3(user_id,file_id):

    s3_key = f"user_{user_id}/file_{file_id}"

    try:
        response = s3.get_object(
            Bucket = BUCKET_NAME,
            Key = s3_key
        )

        return response["Body"].read()

    except ClientError as e:
        error_code = e.response["Error"]["Code"]

        if error_code in ["NoSuchKey","404"]:
            return b""

        raise