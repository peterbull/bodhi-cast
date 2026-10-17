terraform {
  required_version = ">= 1.9, < 2.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.0"
    }
  }
}
provider "cloudflare" {}
variable "droplet_ipv4" {
  type = string
  validation {
    condition     = can(cidrhost("${var.droplet_ipv4}/32", 0))
    error_message = "Provide the deployed droplet's IPv4 address."
  }
}
data "cloudflare_zones" "bodhicast" {
  name = "bodhicast.com"
  lifecycle {
    postcondition {
      condition     = length(self.result) == 1
      error_message = "The token must have access to exactly one bodhicast.com zone."
    }
  }
}
resource "cloudflare_dns_record" "apex" {
  zone_id = data.cloudflare_zones.bodhicast.result[0].id
  name    = "bodhicast.com"
  type    = "A"
  content = var.droplet_ipv4
  ttl     = 1
  proxied = true
  comment = "Bodhi Cast droplet"
  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zones.bodhicast.result[0].id
  name    = "www.bodhicast.com"
  type    = "A"
  content = var.droplet_ipv4
  ttl     = 1
  proxied = true
  comment = "Bodhi Cast droplet"
  lifecycle {
    prevent_destroy = true
  }
}
