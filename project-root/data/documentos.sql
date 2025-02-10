-- Table: public.documentos

-- DROP TABLE IF EXISTS public.documentos;

CREATE TABLE IF NOT EXISTS public.documentos
(
    id integer NOT NULL DEFAULT nextval('documentos_id_seq'::regclass),
    usuario_id integer NOT NULL,
    nombre_archivo character varying COLLATE pg_catalog."default" NOT NULL,
    ruta_archivo character varying COLLATE pg_catalog."default" NOT NULL,
    fecha_subida timestamp without time zone NOT NULL,
    descripcion character varying COLLATE pg_catalog."default",
    tipo_documento character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT documentos_pkey PRIMARY KEY (id),
    CONSTRAINT documentos_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuario (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.documentos
    OWNER to postgres;