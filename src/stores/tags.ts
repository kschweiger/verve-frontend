// src/stores/tags.ts
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export interface ActivityTagCategoryPublic {
  id: number;
  name: string;
}

export interface ActivityTagPublic {
  id: number;
  name: string;
  category_id: number | null;
}

export interface TagSearchResult {
  id: number;
  phrase: string;
  score?: number;
}

interface UserTagResponse {
  tags: ActivityTagPublic[];
  categories: ActivityTagCategoryPublic[];
}

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<ActivityTagPublic[]>([]);
  const categories = ref<ActivityTagCategoryPublic[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': 'application/json',
  });

  async function fetchAll() {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/all`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch tags and categories.');
      const data: UserTagResponse = await response.json();
      tags.value = data.tags;
      categories.value = data.categories;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function searchTags(query: string, limit = 20): Promise<TagSearchResult[]> {
    if (!query) return [];
    try {
      const params = new URLSearchParams({ query, limit: limit.toString() });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/search?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Tag search failed');

      const data = await response.json();
      return data.data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function searchCategories(query: string, limit = 20): Promise<TagSearchResult[]> {
    if (!query) return [];
    try {
      const params = new URLSearchParams({ query, limit: limit.toString() });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/category/find?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Category search failed');

      const data = await response.json();
      return data.data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function createCategory(name: string): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/category/add`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create category.');
      await fetchAll();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function createTag(name: string, categoryId: number | null): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/add`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name, category_id: categoryId }),
      });
      if (!response.ok) throw new Error('Failed to create tag.');
      await fetchAll();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function deleteCategory(id: number, cascade = false): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/category/${id}?cascade=${cascade}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete category.');
      await fetchAll();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function deleteTag(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tag/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete tag.');
      await fetchAll();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function addTagToActivity(activityId: string, tagId: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/add_tag?tag_id=${tagId}`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to add tag to activity.');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function removeTagFromActivity(activityId: string, tagId: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/tag/${tagId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to remove tag from activity.');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }


  return {
    tags,
    categories,
    isLoading,
    error,
    fetchAll,
    searchTags,
    searchCategories,
    createCategory,
    createTag,
    deleteCategory,
    deleteTag,
    addTagToActivity,
    removeTagFromActivity,
  };
});
