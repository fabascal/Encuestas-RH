-- migrate:up

INSERT INTO permissions (code, name, group_name)
VALUES ('direccion.ver', 'Ver el panel de dirección', 'Dirección');

INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'direccion.ver' FROM roles WHERE code = 'admin';

-- migrate:down

DELETE FROM role_permissions WHERE permission_code = 'direccion.ver';
DELETE FROM permissions WHERE code = 'direccion.ver';
