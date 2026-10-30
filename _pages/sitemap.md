---
sitemap: false
layout: archive
title: "Sitemap"
permalink: /sitemap/
author_profile: true
---

{% include base_path %}

Only pages linked through the site's navigation and their linked portfolio entries are listed here. The [XML sitemap]({{ base_path }}/sitemap.xml) is available for search engines.

{% assign listed_pages = site.pages | where: "sitemap", true %}
{% if listed_pages.size > 0 %}
<h2>Pages</h2>
{% for post in listed_pages %}
  {% include archive-single.html %}
{% endfor %}
{% endif %}

{% assign listed_posts = site.posts | where: "sitemap", true %}
{% if listed_posts.size > 0 %}
<h2>Posts</h2>
{% for post in listed_posts %}
  {% include archive-single.html %}
{% endfor %}
{% endif %}

{% for collection in site.collections %}
  {% unless collection.output == false or collection.label == "posts" %}
    {% assign listed_docs = collection.docs | where: "sitemap", true %}
    {% if listed_docs.size > 0 %}
<h2>{{ collection.label }}</h2>
      {% for post in listed_docs %}
  {% include archive-single.html %}
      {% endfor %}
    {% endif %}
  {% endunless %}
{% endfor %}
