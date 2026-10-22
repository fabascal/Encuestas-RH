-- migrate:up

INSERT INTO permissions (code, name, group_name)
VALUES ('origen.ver', 'Ver el origen de datos', 'Origen de datos');

UPDATE permissions
SET name = 'Ajustar el origen de datos'
WHERE code = 'origen.gestionar';

INSERT INTO role_permissions (role_id, permission_code)
SELECT role_id, 'origen.ver'
FROM role_permissions
WHERE permission_code = 'origen.gestionar';

-- migrate:down

DELETE FROM role_permissions WHERE permission_code = 'origen.ver';

UPDATE permissions
SET name = 'Ver y ajustar el origen de datos'
WHERE code = 'origen.gestionar';

DELETE FROM permissions WHERE code = 'origen.ver';
