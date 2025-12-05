import { toast } from 'sonner';

/**
 * Downloads a file directly without navigating away from the page
 * Uses fetch to get the file as blob and creates a download link
 */
export const downloadFile = async (url: string, fileName: string = 'download') => {
  try {
    toast.info('Iniciando download...');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Falha ao baixar arquivo');
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    
    toast.success('Download concluído!');
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.error('Erro ao baixar arquivo');
  }
};
