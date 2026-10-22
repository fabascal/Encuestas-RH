-- migrate:up

INSERT INTO roles (code, name, description, is_system) VALUES
  ('station_manager', 'Gerente de estación', 'Ve el panel y los reportes de sus estaciones.', true);

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM roles r
JOIN permissions p ON p.code IN ('panel.ver', 'reportes.ver')
WHERE r.code = 'station_manager';

-- migrate:down

UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'floor_manager')
WHERE role_id = (SELECT id FROM roles WHERE code = 'station_manager');

DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'station_manager');

DELETE FROM roles WHERE code = 'station_manager';
