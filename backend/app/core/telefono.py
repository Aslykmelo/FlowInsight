import re


def normalizar_telefono(valor: str) -> str:
    """Devuelve el telefono en formato internacional (+57...). Acepta celulares
    colombianos de 10 digitos (3XXXXXXXXX) y numeros ya internacionales.
    Lanza ValueError si el formato no es valido."""
    limpio = re.sub(r"[\s\-().]", "", valor or "")
    if limpio.startswith("00"):
        limpio = "+" + limpio[2:]
    if re.fullmatch(r"3\d{9}", limpio):
        limpio = "+57" + limpio
    elif re.fullmatch(r"57\d{10}", limpio):
        limpio = "+" + limpio
    if not re.fullmatch(r"\+\d{10,15}", limpio):
        raise ValueError(
            "Telefono invalido: use un celular de 10 digitos (ej. 3001234567) "
            "o un numero internacional con prefijo +."
        )
    return limpio


def enmascarar_telefono(telefono: str | None) -> str | None:
    if not telefono:
        return None
    return "*" * max(len(telefono) - 4, 0) + telefono[-4:]
