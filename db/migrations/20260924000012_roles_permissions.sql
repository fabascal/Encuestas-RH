-- migrate:up

CREATE TABLE permissions (
  code text PRIMARY KEY,
  name text NOT NULL,
  group_name text NOT NULL
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code),
  PRIMARY KEY (role_id, permission_code)
);

INSERT INTO permissions (code, name, group_name) VALUES
  ('panel.ver', 'Ver el panel operativo', 'Panel'),
  ('reportes.ver', 'Ver reportes', 'Reportes'),
  ('reportes.exportar', 'Exportar reportes', 'Reportes'),
  ('organizacion.gestionar', 'Gestionar organización', 'Organización'),
  ('usuarios.gestionar', 'Gestionar usuarios', 'Usuarios'),
  ('roles.gestionar', 'Gestionar roles y permisos', 'Roles'),
  ('reglas.gestionar', 'Gestionar reglas de bono', 'Reglas'),
  ('captura.gestionar', 'Capturar datos manuales', 'Captura'),
  ('integraciones.gestionar', 'Gestionar integraciones', 'Integraciones'),
  ('periodos.cerrar', 'Cerrar periodos', 'Periodos'),
  ('alcance.total', 'Ver todas las empresas, zonas y estaciones', 'Alcance');

INSERT INTO roles (code, name, description, is_system) VALUES
  ('admin', 'Administrador general', 'Acceso completo. No se puede modificar.', true),
  ('zone_manager', 'Gerente de zona', 'Ve el panel y los reportes de su zona.', true),
  ('floor_manager', 'Jefe de piso', 'Ve el panel y los reportes de su estación.', true);

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin';

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM roles r
JOIN permissions p ON p.code IN ('panel.ver', 'reportes.ver', 'reportes.exportar')
WHERE r.code = 'zone_manager';

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM roles r
JOIN permissions p ON p.code IN ('panel.ver', 'reportes.ver')
WHERE r.code = 'floor_manager';

ALTER TABLE users ADD COLUMN role_id uuid REFERENCES roles(id);

UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.code = u.role::text;

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE users DROP COLUMN role;
DROP TYPE user_role;

-- migrate:down

CREATE TYPE user_role AS ENUM ('admin', 'zone_manager', 'floor_manager');
ALTER TABLE users ADD COLUMN role user_role;

UPDATE users u
SET role = r.code::user_role
FROM roles r
WHERE r.id = u.role_id AND r.code IN ('admin', 'zone_manager', 'floor_manager');

UPDATE users SET role = 'floor_manager' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users DROP COLUMN role_id;

DROP TABLE role_permissions;
DROP TABLE roles;
DROP TABLE permissions;
