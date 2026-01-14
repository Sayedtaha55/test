import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Share2, Eye } from 'lucide-react';
import { ShopGallery } from '@/types';

interface ShopGalleryProps {
  images: ShopGallery[];
  shopName: string;
  primaryColor: string;
  layout: 'minimal' | 'modern' | 'bold';
}

const ShopGalleryComponent: React.FC<ShopGalleryProps> = ({ 
  images, 
  shopName, 
  primaryColor, 
  layout 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const isBold = layout === 'bold';
  const isMinimal = layout === 'minimal';

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  const nextImage = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleShare = async () => {
    if (selectedImage) {
      try {
        await navigator.clipboard.writeText(selectedImage.imageUrl);
        // Show toast or notification
      } catch (e) {}
    }
  };

  if (images.length === 0) {
    return (
      <div className={`text-center py-16 md:py-24 border-2 border-dashed rounded-[2rem] md:rounded-[3rem] ${
        isMinimal ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'
      }`}>
        <Eye className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg md:text-2xl font-black mb-2 text-slate-400">لا توجد صور معروضة</h3>
        <p className="text-sm md:text-base text-slate-300">سيتم إضافة معرض الصور قريباً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Gallery Grid */}
      <div className={`grid gap-3 md:gap-6 ${
        images.length === 1 ? 'grid-cols-1' :
        images.length === 2 ? 'grid-cols-2' :
        images.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
      }`}>
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedIndex(index)}
            className={`relative aspect-square overflow-hidden cursor-pointer group ${
              isBold ? 'rounded-[1.5rem] md:rounded-[2rem]' : 
              isMinimal ? 'rounded-lg md:rounded-xl' : 
              'rounded-xl md:rounded-2xl'
            } shadow-lg hover:shadow-2xl transition-all duration-300`}
          >
            <img 
              src={image.thumbUrl || image.imageUrl} 
              alt={image.caption || `${shopName} - ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                <Eye className="w-8 h-8 md:w-12 md:h-12 text-white" />
              </div>
            </div>

            {/* Favorite Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }}
              className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
            >
              <Heart 
                size={16} 
                className={isFavorite ? 'text-red-500 fill-current' : 'text-slate-600'} 
              />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute -top-12 right-0 p-3 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              {/* Image */}
              <div className="relative bg-black rounded-[2rem] overflow-hidden">
                <img 
                  src={selectedImage.imageUrl} 
                  alt={selectedImage.caption || `${shopName} - ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      disabled={selectedIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={selectedIndex === images.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* Image Info */}
              <div className="mt-6 text-center text-white">
                <h3 className="text-xl md:text-2xl font-black mb-2">
                  {shopName} - {selectedIndex + 1} / {images.length}
                </h3>
                {selectedImage.caption && (
                  <p className="text-white/80 text-sm md:text-base">{selectedImage.caption}</p>
                )}
                
                {/* Actions */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={handleShare}
                    className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
                  >
                    <Heart 
                      size={20} 
                      className={isFavorite ? 'fill-current' : ''} 
                    />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto no-scrollbar">
                  {images.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        index === selectedIndex 
                          ? 'border-white scale-110' 
                          : 'border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img.imageUrl} 
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopGalleryComponent;
