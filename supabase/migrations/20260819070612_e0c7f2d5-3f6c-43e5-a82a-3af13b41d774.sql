CREATE POLICY "setlup files own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'setlup-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "setlup files own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'setlup-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "setlup files own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'setlup-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "setlup files own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'setlup-files' AND (storage.foldername(name))[1] = auth.uid()::text);