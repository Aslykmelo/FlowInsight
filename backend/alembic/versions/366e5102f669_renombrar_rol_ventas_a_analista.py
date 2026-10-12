"""renombrar rol Ventas a Analista

Revision ID: 366e5102f669
Revises: d5e161c69376
Create Date: 2026-10-12 14:42:02.316775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '366e5102f669'
down_revision: Union[str, None] = 'd5e161c69376'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE rol SET nombre_rol = 'Analista' WHERE nombre_rol = 'Ventas'")


def downgrade() -> None:
    op.execute("UPDATE rol SET nombre_rol = 'Ventas' WHERE nombre_rol = 'Analista'")
