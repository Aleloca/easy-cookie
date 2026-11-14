---
'@easy-cookie/core': patch
---

Re-prompt after a revision change on real hostnames. The consent cookie is written with `Domain=<hostname>`, but it was erased without a Domain, so Chrome kept it and the banner did not come back. The erase now also clears the domain variants (configured or current hostname, and without `www.`).
