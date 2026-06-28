-- Allow portfolio video uploads in style-covers bucket (mime types + 50MB limit)
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = (
    select array(
      select distinct unnest(
        coalesce(allowed_mime_types, array[]::text[]) ||
        array['video/mp4', 'video/quicktime', 'video/webm']::text[]
      )
    )
  )
where id = 'style-covers';
