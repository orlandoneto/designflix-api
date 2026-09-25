# Oracle Cloud — criar VM Always Free (do zero)

Guia passo a passo para subir uma VM Linux no OCI (região **Brazil East / sa-saopaulo-1**), com rede pública e SSH.

Referência da conta Designflix (estado atual):

| Recurso | Nome |
|---------|------|
| Tenancy / compartment | `orlandoneto23 (root)` |
| VCN | `vcn-designflix` |
| Subnet | `public-subnet` (regional, pública) |
| Internet Gateway | `igw-designflix` |
| Route Table | Default Route Table for `vcn-designflix` |
| Instância | `designflix-api` |
| Shape | `VM.Standard.E2.1.Micro` (Always Free) |
| SO | Oracle Linux 9 |
| Usuário SSH | `opc` |

Acesso SSH e chaves: [oci-ssh-access.md](./oci-ssh-access.md).

---

## 0. Antes de começar

1. Conta Oracle Cloud Free Tier / Always Free.
2. Região: **Brazil East (Sao Paulo)**.
3. No PC, tenha (ou gere) um par SSH:
   - privado: `algo.key`
   - público: `algo.key.pub` (texto começando com `ssh-rsa` ou `ssh-ed25519`)

No console: [https://cloud.oracle.com](https://cloud.oracle.com) → login com Cloud Account Name.

---

## 1. Criar a VCN (rede)

1. Menu ☰ → **Networking** → **Virtual cloud networks**
2. **Create VCN** (ou “Create VCN only” / sem wizard completo, se preferir controlar cada peça)
3. Preencha:
   - **Name:** `vcn-designflix`
   - **Compartment:** `orlandoneto23 (root)`
   - **IPv4 CIDR Block:** `10.0.0.0/16` (padrão ok)
   - **DNS Label:** obrigatório se pedir (ex.: `designflix`)
4. Create

Se usar o wizard “VCN with Internet Connectivity”, ele já cria subnet pública, IGW e rota. Se criar VCN “só”, continue os passos 2–5 abaixo.

---

## 2. Internet Gateway (saída/entrada na internet)

Sem IGW, a VM com IP público **não responde** (SSH dá timeout).

1. Abra a VCN `vcn-designflix`
2. Aba **Gateways**
3. Em **Internet Gateways** → **Create Internet Gateway**
4. Name: `igw-designflix`
5. Deixe **Enabled** / Attached
6. Create

Não precisa criar NAT / DRG / Service Gateway para SSH básico.

---

## 3. Route Table (rota `0.0.0.0/0` → IGW)

A Default Route Table **não pode ficar com 0 rules**.

1. Na VCN → aba **Routing** (ou Resources → Route Tables)
2. Abra **Default Route Table for vcn-designflix**
3. **Add Route Rules**
4. Preencha:
   - **Destination CIDR Block:** `0.0.0.0/0`
   - **Target Type:** Internet Gateway
   - **Target Internet Gateway:** `igw-designflix`
5. Salve

Confirme: **Number of Rules ≥ 1**.

> Não crie uma Route Table nova só por criar — use a Default (ou associe a nova à subnet). A subnet precisa apontar para a tabela que tem essa regra.

---

## 4. Subnet pública

1. VCN → aba **Subnets** → **Create Subnet**
2. Preencha:
   - **Name:** `public-subnet`
   - **Subnet Type:** Regional
   - **CIDR:** ex. `10.0.0.0/24` (dentro do CIDR da VCN)
   - **Route Table:** Default Route Table for `vcn-designflix`
   - **Subnet access:** **Public**
   - **DNS Label:** se pedir (ex.: `public`)
3. Create

---

## 5. Security List (abrir SSH — porta 22)

1. VCN → aba **Security** → Security Lists  
   (ou abra a subnet → Security Lists)
2. Abra a **Default Security List** (ou a lista ligada à `public-subnet`)
3. **Ingress Rules** → Add:
   - **Source Type:** CIDR
   - **Source CIDR:** `0.0.0.0/0` (ou só o seu IP `/32` se quiser restringir)
   - **IP Protocol:** TCP
   - **Destination Port Range:** `22`
   - **Source Port Range:** All (não coloque 22 no source)
   - **Stateless:** desligado (stateful)
4. **Egress Rules:** deve existir algo como:
   - Destination `0.0.0.0/0`, All protocols (padrão ok)

Confirme que a **subnet** usa essa Security List.

---

## 6. Criar a instância (VM)

1. Menu ☰ → **Compute** → **Instances** → **Create instance**
2. **Basic**
   - Name: `designflix-api`
   - Compartment: root
   - Availability domain: AD-1 (padrão)
   - Image: **Oracle Linux 9**
   - Shape: **Change shape** → Always Free-eligible  
     - `VM.Standard.E2.1.Micro` (AMD, 1 OCPU / 1 GB), ou  
     - `VM.Standard.A1.Flex` (Ampere) se houver capacidade (ex. 2 OCPU / 12 GB dentro do free)
3. **Security** — Shielded pode ficar desligado
4. **Networking**
   - Select existing VCN: `vcn-designflix`
   - Subnet: `public-subnet`
   - **Automatically assign public IPv4 address:** Yes
5. **Add SSH keys**
   - **Paste public keys**
   - Cole o conteúdo do arquivo `.pub` (não o `.key` privado)
6. Storage — padrão
7. Review → **Create**

Espere status **Running**. Anote o **Public IP**.

---

## 7. Out of capacity (A1.Flex)

São Paulo (`sa-saopaulo-1`) tem **só 1 AD**. Se aparecer:

> Out of capacity for shape VM.Standard.A1.Flex in availability domain AD-1

não é erro de config — falta host Ampere.

### Alvo Designflix

| Campo | Valor |
|-------|--------|
| Shape | `VM.Standard.A1.Flex` |
| OCPU / RAM | **2 / 12 GB** (Always Free) |
| VCN / subnet | `vcn-designflix` / `public-subnet` |
| SSH | `keys/designflix-oci.key.pub` |
| Fault Domain | **Deixar a Oracle escolher** (não fixar FD-1/2/3) |

### Estratégia

1. Fault Domain = *Let Oracle choose the best fault domain* (não fixar FD-1/2/3)
2. Form com 2 OCPU / 12 GB → **Create** a cada ~1–2 min
3. **Melhor janela em SP:** ~**02h–04h**; ainda assim vale tentar de dia
4. Retry automatizado: só no **Oracle Cloud Shell** (fora deste repo)
5. Alternativa: conta **Pay-As-You-Go** (2/12 free tipicamente sem cobrança)

## 8. Checklist se o SSH der timeout

| Verificação | Onde |
|-------------|------|
| Instância Running + Public IP | Compute → Instance |
| IGW existe e Enabled | VCN → Gateways |
| Rota `0.0.0.0/0` → IGW | Route Tables (não pode ser 0 rules) |
| Ingress TCP 22 Source `0.0.0.0/0` | Security List |
| Subnet pública + route table correta | Subnet Details |
| Firewall local / antivírus | PC |

Se aparecer `Permission denied (publickey)` → rede ok; chave errada. Ver [oci-ssh-access.md](./oci-ssh-access.md).

---

## 9. Recriar só a VM (sem refazer a rede)

VCN, subnet, IGW, rota e security list **ficam**.

1. Terminate a instância antiga (marque delete boot volume)
2. Create instance de novo na mesma VCN/subnet
3. Cole de novo o `.pub` em Paste public keys
4. Use o **novo** Public IP

---

## 10. Limites Always Free (resumo)

- Em Free Trial / Always Free, a conta pode limitar shapes.
- Micro: tipicamente **1** `E2.1.Micro` por região.
- Ampere A1: até 4 OCPU / 24 GB no total free (compartilhado), sujeito a capacidade (“Out of capacity” → tente Micro ou outra AD/horário).

---

## Ordem mental (resumo)

```
VCN → Internet Gateway → Route 0.0.0.0/0 → IGW
    → Subnet pública
    → Security List (TCP 22)
    → Instance (public IP + paste .pub)
    → SSH
```
