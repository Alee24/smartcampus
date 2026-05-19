from ldap3 import Server, Connection, ALL, SUBTREE
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class LDAPClient:
    def __init__(self, server_uri: str, bind_dn: str, bind_password: str, base_dn: str):
        self.server_uri = server_uri
        self.bind_dn = bind_dn
        self.bind_password = bind_password
        self.base_dn = base_dn

    def get_user_by_id(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Search for a user in LDAP/Active Directory by identifier (e.g., sAMAccountName or admissionNumber).
        """
        try:
            server = Server(self.server_uri, get_info=ALL)
            conn = Connection(server, self.bind_dn, self.bind_password, auto_bind=True)
            
            # Common AD search filter: (|(sAMAccountName=ID)(employeeNumber=ID)(uid=ID))
            # Adjust based on specific AD schema if needed. 
            # Often university IDs are in 'employeeNumber' or 'pager' or a custom attribute.
            search_filter = f"(|(sAMAccountName={identifier})(employeeNumber={identifier})(uid={identifier})(mail={identifier}))"
            
            conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=['sAMAccountName', 'displayName', 'mail', 'employeeNumber', 'department', 'title', 'telephoneNumber']
            )

            if not conn.entries:
                return None

            entry = conn.entries[0]
            
            # Map LDAP attributes to our User model fields
            return {
                "full_name": str(entry.displayName) if hasattr(entry, 'displayName') else "",
                "email": str(entry.mail) if hasattr(entry, 'mail') else None,
                "admission_number": identifier, # Or entry.employeeNumber if that's the source of truth
                "school": str(entry.department) if hasattr(entry, 'department') else "General",
                "phone_number": str(entry.telephoneNumber) if hasattr(entry, 'telephoneNumber') else None,
                "program": str(entry.title) if hasattr(entry, 'title') else None,
            }

        except Exception as e:
            logger.error(f"LDAP Error: {str(e)}")
            return None
        finally:
            if 'conn' in locals() and conn:
                conn.unbind()
