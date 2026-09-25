# Oracle Cloud — acesso SSH e chaves no projeto

Como entrar na VM `designflix-api` e onde ficam as chaves neste repositório.

Criação da VM / rede: [oci-vm-setup.md](./oci-vm-setup.md).

---

## Dados atuais da VM

| Campo | Valor |
|-------|--------|
| Nome | `designflix-api` |
| Usuário | `opc` (Oracle Linux) |
| Public IP | `168.75.82.5` (A1.Flex 2 OCPU / 12 GB — `instance-20260924-1513`) |
| Região | `sa-saopaulo-1` (Brazil East) |
| VCN | `vcn-designflix` |

No console: **Compute → Instances → designflix-api → Public IP address**.

---

## Onde estão as chaves (neste projeto)

Pasta local (não vai para o Git):

```
designflix-api/
  keys/
    designflix-oci.key      ← chave PRIVADA (secreta)
    designflix-oci.key.pub  ← chave PÚBLICA (foi colada na VM)
```

- Caminho absoluto típico: `C:\projetos\designflix-api\keys\`
- `.gitignore` ignora `/keys/*` (só mantém `.gitkeep`) — **nunca commitar** a `.key`
- Não deixe cópia solta em `Downloads` (fonte de confusão / chave “errada”)

### Conteúdo do `.pub`

Abra `designflix-oci.key.pub` no Bloco de Notas. Uma linha, algo como:

```text
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ... ssh-key-2026-09-22
```

É **esse** texto que se cola em **Paste public keys** na criação da VM.

---

## Conectar (Windows PowerShell)

Troque `SEU_IP` pelo Public IP atual do console:

```powershell
ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@SEU_IP
```

Exemplo (IP de referência; confirme no console se mudou):

```powershell
ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes opc@168.75.82.5
```

Na primeira conexão: digite `yes` quando perguntar se confia no host.

Prompt esperado:

```text
[opc@designflix-api ~]$
```

Comando único de teste (sem sessão interativa):

```powershell
ssh -i "C:\projetos\designflix-api\keys\designflix-oci.key" -o IdentitiesOnly=yes -o BatchMode=yes opc@SEU_IP "hostname; uptime"
```

---

## Permissões da chave privada (Windows)

O OpenSSH do Windows **recusa** chave se outros usuários tiverem acesso ao arquivo (`UNPROTECTED PRIVATE KEY FILE` / `bad permissions`).

Ajuste (PowerShell, como o usuário dono do arquivo):

```powershell
$key = "C:\projetos\designflix-api\keys\designflix-oci.key"
icacls $key /inheritance:r
icacls $key /remove:g "*S-1-5-32-545" "*S-1-5-11" "*S-1-5-32-544" "*S-1-5-18"
icacls $key /grant:r "${env:USERDOMAIN}\${env:USERNAME}:(F)"
icacls $key
```

Resultado desejado: só `SeuUsuario:(F)` na listagem do `icacls`.

---

## Erros comuns

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| `Connection timed out` | Sem IGW / rota / security list / IP errado | Ver [oci-vm-setup.md](./oci-vm-setup.md) checklist |
| `Connection refused` | VM ainda bootando (sshd) | Esperar 1–2 min e tentar de novo |
| `Permission denied (publickey)` | `.key` não bate com o `.pub` da VM | Usar a chave desta pasta `keys/`; se perdeu o par, **recriar a VM** colando o `.pub` atual |
| `bad permissions` | ACL aberta no Windows | Rodar os `icacls` acima |
| Pediu senha | Chave ignorada / caminho errado | Conferir `-i` aponta para o `.key` (não o `.pub`) |

---

## Par chave ↔ VM (regra de ouro)

1. Na criação da instância, cola-se só o **`.pub`**.
2. No PC, o SSH usa só o **`.key`** com `-i`.
3. Se o par for outro, a rede pode estar ok e mesmo assim dá `Permission denied`.
4. Não dá para “trocar” a chave da VM facilmente pelo console → ou Console Connection, ou **recriar a instância** com o `.pub` certo (rede se reaproveita).

---

## Copiar chave de volta para esta pasta

Se gerou de novo no Downloads:

```powershell
$dest = "C:\projetos\designflix-api\keys"
Copy-Item "$env:USERPROFILE\Downloads\ssh-key-XXXX.key" "$dest\designflix-oci.key" -Force
Copy-Item "$env:USERPROFILE\Downloads\ssh-key-XXXX.key.pub" "$dest\designflix-oci.key.pub" -Force
# depois: icacls (seção permissões) e apagar do Downloads
Remove-Item "$env:USERPROFILE\Downloads\ssh-key-XXXX.key*" -Force
```

---

## Ubuntu vs Oracle Linux

| Imagem | Usuário SSH |
|--------|-------------|
| Oracle Linux | `opc` |
| Ubuntu | `ubuntu` |

A VM Designflix atual é **Oracle Linux** → sempre `opc`.
