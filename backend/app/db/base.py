# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.driver import Driver  # noqa
from app.models.warehouse import Warehouse  # noqa
from app.models.order import Order, OrderStatusHistory, ProofOfDelivery  # noqa
from app.models.location import DriverLocation  # noqa
from app.models.financial import PaymentCollection  # noqa
from app.models.audit import AuditLog  # noqa
from app.models.notification import Notification  # noqa
