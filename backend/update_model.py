#!/usr/bin/env python3
"""
Script to update the Document model to match the new database schema
"""

import re

# Read the original file
with open('app/models/document.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace LargeBinary with String for encryption fields
content = re.sub(
    r'encryption_iv = Column\(LargeBinary\(16\)\)  # Initialization vector for encryption',
    'encryption_iv = Column(String(255))  # Initialization vector for encryption (base64 encoded)',
    content
)

content = re.sub(
    r'encryption_auth_tag = Column\(LargeBinary\(16\)\)  # Authentication tag for GCM mode',
    'encryption_auth_tag = Column(String(255))  # Authentication tag for GCM mode (base64 encoded)',
    content
)

# Add ciphertext field after encryption_auth_tag
content = re.sub(
    r'(encryption_auth_tag = Column\(String\(255\)\)  # Authentication tag for GCM mode \(base64 encoded\)\n)',
    r'\1    ciphertext = Column(Text, nullable=True)  # Encrypted document content (base64 encoded)\n',
    content
)

# Update the to_dict method to remove base64 encoding since fields are now strings
content = re.sub(
    r'            "encryption_iv": base64\.b64encode\(self\.encryption_iv\)\.decode\(\'utf-8\'\) if self\.encryption_iv else None,',
    '            "encryption_iv": self.encryption_iv,',
    content
)

content = re.sub(
    r'            "encryption_auth_tag": base64\.b64encode\(self\.encryption_auth_tag\)\.decode\(\'utf-8\'\) if self\.encryption_auth_tag else None,',
    '            "encryption_auth_tag": self.encryption_auth_tag,\n            "ciphertext": self.ciphertext,',
    content
)

# Write the updated content
with open('app/models/document.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Document model updated successfully!")