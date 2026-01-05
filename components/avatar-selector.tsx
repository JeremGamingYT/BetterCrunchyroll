"use client"

import { useState } from "react"
import { X, Check, User, Link as LinkIcon, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCrunchyrollProfile } from "@/hooks/use-crunchyroll"
import { updateLocalAvatar } from "@/lib/crunchyroll"

interface AvatarSelectorProps {
    isOpen: boolean
    onClose: () => void
}

const PRESET_AVATARS = [
    "https://static.crunchyroll.com/assets/avatar/170x170/generic_01.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/luffy.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/naruto.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/goku.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/deku.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/tanjiro.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/yuji.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/denji.png",
    "https://static.crunchyroll.com/assets/avatar/170x170/anya.png"
]

export function AvatarSelector({ isOpen, onClose }: AvatarSelectorProps) {
    const { data: profile, mutate } = useCrunchyrollProfile()
    const [customUrl, setCustomUrl] = useState("")
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
    const [error, setError] = useState(false)

    if (!isOpen) return null

    const currentAvatar = profile?.avatar

    const handleSave = () => {
        const newAvatar = customUrl || selectedAvatar
        if (newAvatar) {
            updateLocalAvatar(newAvatar)
            mutate({ ...profile!, avatar: newAvatar }, false) // Optimistic update
            window.dispatchEvent(new Event('storage')) // Force triggering updates across tabs/components
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Changer d'avatar</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Current Preview */}
                <div className="flex justify-center mb-8">
                    <div className="relative w-24 h-24 rounded-full border-4 border-primary overflow-hidden shadow-xl">
                        <img
                            src={customUrl || selectedAvatar || currentAvatar || "https://static.crunchyroll.com/assets/avatar/170x170/generic_01.png"}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={() => setError(true)}
                        />
                    </div>
                </div>

                {/* Custom URL Input */}
                <div className="mb-6 space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        URL personnalisée
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            placeholder="https://exemple.com/image.png"
                            value={customUrl}
                            onChange={(e) => {
                                setCustomUrl(e.target.value)
                                setSelectedAvatar(null)
                                setError(false)
                            }}
                            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">Collez l'URL d'une image web (jpg, png, gif)</p>
                </div>

                {/* Presets Grid */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">Sélection rapide</label>
                    <div className="grid grid-cols-4 gap-3">
                        {PRESET_AVATARS.map((url, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setSelectedAvatar(url)
                                    setCustomUrl("")
                                    setError(false)
                                }}
                                className={cn(
                                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                                    selectedAvatar === url ? "border-primary" : "border-transparent hover:border-primary/50"
                                )}
                            >
                                <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                {selectedAvatar === url && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <Check className="w-6 h-6 text-white drop-shadow-md" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!customUrl && !selectedAvatar}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    )
}
