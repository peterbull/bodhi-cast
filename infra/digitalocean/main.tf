terraform {
  required_version = ">= 1.9, < 2.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.106.0"
    }
  }
}

provider "digitalocean" {}

variable "region" {
  type    = string
  default = "nyc3"
}
variable "size" {
  type    = string
  default = "s-1vcpu-1gb"
  validation {
    condition     = contains(["s-1vcpu-1gb", "s-1vcpu-2gb"], var.size)
    error_message = "Use the 1 GB or 2 GB Basic droplet. Larger plans require approval."
  }
}
variable "ssh_source_cidrs" {
  type        = list(string)
  description = "Trusted administrator networks allowed to connect by SSH."
  validation {
    condition     = length(var.ssh_source_cidrs) > 0 && alltrue([for cidr in var.ssh_source_cidrs : can(cidrhost(cidr, 0)) && !endswith(cidr, "/0")])
    error_message = "Provide specific administrator CIDRs; public SSH is not allowed."
  }
}
variable "ssh_public_key_path" {
  type    = string
  default = "../../secrets/deploy_ed25519.pub"
}

data "digitalocean_sizes" "selected" {
  filter {
    key    = "slug"
    values = [var.size]
  }
  lifecycle {
    postcondition {
      condition     = length(self.sizes) == 1 && try(self.sizes[0].price_monthly <= 20 && self.sizes[0].available && contains(self.sizes[0].regions, var.region), false)
      error_message = "The requested droplet is unavailable in this region or exceeds the $20 monthly budget."
    }
  }
}

resource "digitalocean_ssh_key" "deploy" {
  name       = "bodhi-cast-deploy-20261017"
  public_key = file(var.ssh_public_key_path)
}
resource "digitalocean_droplet" "app" {
  name       = "bodhi-cast"
  image      = "ubuntu-24-04-x64"
  region     = var.region
  size       = data.digitalocean_sizes.selected.sizes[0].slug
  ssh_keys   = [digitalocean_ssh_key.deploy.fingerprint]
  monitoring = true
  backups    = false
  ipv6       = false
  user_data  = file("${path.module}/cloud-init.yaml")
  lifecycle {
    prevent_destroy = true
  }
}
resource "digitalocean_firewall" "app" {
  name        = "bodhi-cast"
  droplet_ids = [digitalocean_droplet.app.id]
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_source_cidrs
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0"]
  }
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "53"
    destination_addresses = ["0.0.0.0/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "123"
    destination_addresses = ["0.0.0.0/0"]
  }
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0"]
  }
}
output "ipv4_address" { value = digitalocean_droplet.app.ipv4_address }
output "droplet_id" { value = digitalocean_droplet.app.id }
output "monthly_droplet_usd" { value = data.digitalocean_sizes.selected.sizes[0].price_monthly }
