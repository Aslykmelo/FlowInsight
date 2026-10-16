
"""agregar origen_hash a detalle_pedido para deteccion de duplicados

Revision ID: a01811ef8767
Revises: 03d53572032b
Create Date: 2026-10-01 22:19:51.417672
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de la migración
revision: str = "a01811ef8767"
down_revision: Union[str, None] = "03d53572032b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega origen_hash y su índice solo si no existen."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Comprobar las columnas existentes en detalle_pedido
    columnas = {
        columna["name"]
        for columna in inspector.get_columns(
            "detalle_pedido",
            schema="public",
        )
    }

    # Crear la columna únicamente si hace falta
    if "origen_hash" not in columnas:
        op.add_column(
            "detalle_pedido",
            sa.Column(
                "origen_hash",
                sa.String(length=64),
                nullable=True,
            ),
            schema="public",
        )

    # Actualizar la inspección después del posible cambio
    inspector = sa.inspect(bind)

    # Comprobar los índices existentes
    indices = {
        indice["name"]
        for indice in inspector.get_indexes(
            "detalle_pedido",
            schema="public",
        )
    }

    # Crear el índice únicamente si hace falta
    if "ix_detalle_pedido_origen_hash" not in indices:
        op.create_index(
            "ix_detalle_pedido_origen_hash",
            "detalle_pedido",
            ["origen_hash"],
            unique=False,
            schema="public",
        )


def downgrade() -> None:
    """Revierte la migración eliminando el índice y la columna."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)

    indices = {
        indice["name"]
        for indice in inspector.get_indexes(
            "detalle_pedido",
            schema="public",
        )
    }

    if "ix_detalle_pedido_origen_hash" in indices:
        op.drop_index(
            "ix_detalle_pedido_origen_hash",
            table_name="detalle_pedido",
            schema="public",
        )

    # Volver a inspeccionar las columnas antes de eliminar
    inspector = sa.inspect(bind)

    columnas = {
        columna["name"]
        for columna in inspector.get_columns(
            "detalle_pedido",
            schema="public",
        )
    }

    if "origen_hash" in columnas:
        op.drop_column(
            "detalle_pedido",
            "origen_hash",
            schema="public",
        )
