-- migrate:up

DELETE FROM role_permissions WHERE permission_code = 'panel.ver';

UPDATE roles SET description = 'Ve los reportes de su zona.', updated_at = now()
WHERE code = 'zone_manager';

UPDATE roles SET description = 'Ve los reportes de su estación.', updated_at = now()
WHERE code = 'floor_manager';

UPDATE roles SET description = 'Ve los reportes de sus estaciones.', updated_at = now()
WHERE code = 'station_manager';

-- migrate:down

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, 'panel.ver'
FROM roles r
WHERE r.code IN ('admin', 'floor_manager', 'station_manager')
ON CONFLICT DO NOTHING;

UPDATE roles SET description = 'Ve el panel y los reportes de su zona.', updated_at = now()
WHERE code = 'zone_manager';

UPDATE roles SET description = 'Ve el panel y los reportes de su estación.', updated_at = now()
WHERE code = 'floor_manager';

UPDATE roles SET description = 'Ve el panel y los reportes de sus estaciones.', updated_at = now()
WHERE code = 'station_manager';
