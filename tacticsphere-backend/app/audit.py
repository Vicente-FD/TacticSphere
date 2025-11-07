from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditActionEnum, AuditLog, Usuario

logger = logging.getLogger("tacticsphere.audit")


def audit_log(
    db: Session,
    *,
    action: AuditActionEnum,
    current_user: Optional[Usuario],
    empresa_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    notes: Optional[str] = None,
    diff_before: Optional[dict] = None,
    diff_after: Optional[dict] = None,
    extra: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Guarda un registro de auditoría sin interrumpir el flujo principal."""
    try:
        ip = request.client.host if request and request.client else None
        user_agent = request.headers.get("user-agent") if request else None
        method = request.method if request else None
        path = request.url.path if request else None

        log = AuditLog(
            action=action,
            user_id=current_user.id if current_user else None,
            user_email=current_user.email if current_user else None,
            user_role=current_user.rol.value if current_user else None,
            empresa_id=empresa_id if empresa_id is not None else getattr(current_user, "empresa_id", None),
            entity_type=entity_type,
            entity_id=entity_id,
            notes=notes,
            ip=ip,
            user_agent=user_agent,
            method=method,
            path=path,
            diff_before=diff_before,
            diff_after=diff_after,
            extra=extra,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo guardar el registro de auditoría")


def audited_action(
    action: AuditActionEnum,
    *,
    entity_type: Optional[str] = None,
    notes_builder: Optional[Callable[[Any], Optional[str]]] = None,
    entity_id_getter: Optional[Callable[[Any], Optional[int]]] = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorador opcional para registrar automáticamente acciones."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = func(*args, **kwargs)
            db: Optional[Session] = kwargs.get("db")
            current: Optional[Usuario] = kwargs.get("current")
            request: Optional[Request] = kwargs.get("request")
            empresa_id = kwargs.get("empresa_id")

            if db:
                entity_id = None
                if entity_id_getter:
                    entity_id = entity_id_getter(result)
                elif hasattr(result, "id"):
                    entity_id = getattr(result, "id")

                try:
                    audit_log(
                        db,
                        action=action,
                        current_user=current,
                        empresa_id=empresa_id or getattr(current, "empresa_id", None),
                        entity_type=entity_type,
                        entity_id=entity_id,
                        notes=notes_builder(result) if notes_builder else None,
                        request=request,
                    )
                except Exception:
                    # audit_log already handles logging/rollback
                    pass
            return result

        return wrapper

    return decorator
