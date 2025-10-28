
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

/*
CREATE TABLE public.casetas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  municipio_id uuid NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT casetas_pkey PRIMARY KEY (id),
  CONSTRAINT casetas_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipios(id)
);
CREATE TABLE public.control_diario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bombero_id uuid NOT NULL,
  fecha date NOT NULL,
  codigo USER-DEFINED NOT NULL,
  hora_entrada time without time zone NOT NULL,
  hora_salida time without time zone NOT NULL,
  horas_extras numeric NOT NULL DEFAULT 0,
  CONSTRAINT control_diario_pkey PRIMARY KEY (id),
  CONSTRAINT control_diario_bombero_id_fkey FOREIGN KEY (bombero_id) REFERENCES public.users(id)
);
CREATE TABLE public.municipios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  zona USER-DEFINED NOT NULL,
  CONSTRAINT municipios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.salidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anotacion_id uuid NOT NULL,
  tipo USER-DEFINED NOT NULL,
  hora_salida time without time zone NOT NULL,
  hora_entrada time without time zone NOT NULL,
  lugar text NOT NULL,
  CONSTRAINT salidas_pkey PRIMARY KEY (id),
  CONSTRAINT salidas_control_diario_id_fkey FOREIGN KEY (anotacion_id) REFERENCES public.control_diario(id)
);
CREATE TABLE public.unidades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  zona USER-DEFINED NOT NULL,
  CONSTRAINT unidades_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  dni text UNIQUE,
  nombre text,
  apellidos text,
  rol USER-DEFINED DEFAULT 'pending'::rol,
  unidad_id uuid,
  caseta_id uuid,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  email text UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT users_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES public.unidades(id),
  CONSTRAINT users_caseta_id_fkey FOREIGN KEY (caseta_id) REFERENCES public.casetas(id)

);
*/