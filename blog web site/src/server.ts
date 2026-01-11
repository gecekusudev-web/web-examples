import express, { Request, Response } from 'express';
import path from 'path';

// --- Tür Tanımlamaları ---
interface User {
    id: number;
    name: string;
}

interface Post {
    id: number;
    userId: number;
    title: string;
    content: string;
    visibility: 'public' | 'friends' | 'private';
}

// --- Mock Veriler ---
const USERS: User[] = [
    { id: 1, name: 'Ayşe' },
    { id: 2, name: 'Ahmet' },
    { id: 3, name: 'Mehmet' },
];

// Kimin kimin arkadaşı olduğu. Bağlar tek yönlüdür, simetriktir.
// (1, 2) arkadaş demektir, (2, 1) de.
const FRIENDS: [number, number][] = [
    [1, 2], // Ayşe <-> Ahmet
    [2, 3], // Ahmet <-> Mehmet
    [1, 3] // Ayşe <-> Mehmet
];

const POSTS: Post[] = [
    // Ayşe (ID: 1) postları
    { id: 101, userId: 1, title: 'Ayşe - Herkese Açık Gezi Notları', content: 'Pariste harika bir gün.', visibility: 'public' },
    { id: 102, userId: 1, title: 'Ayşe - Arkadaşlar Özel Film Tavsiyesi', content: 'Şu filmi mutlaka izlemelisiniz.', visibility: 'friends' },
    { id: 103, userId: 1, title: 'Ayşe - Sadece Bana Özel Günlük', content: 'Kimse okumasın.', visibility: 'private' },

    // Ahmet (ID: 2) postları
    { id: 201, userId: 2, title: 'Ahmet - Herkese Açık Yazılım İpuçları', content: 'Docker Volume kullanımı kritik.', visibility: 'public' },
    { id: 202, userId: 2, title: 'Ahmet - Arkadaşlar Özel Maç Yorumu', content: 'Dün akşamki maç...', visibility: 'friends' },
    { id: 203, userId: 2, title: 'Ahmet - Sadece Bana Özel Fikirler', content: 'Bu projeyi geliştirmeliyim.', visibility: 'private' },
    
    // Mehmet (ID: 3) postları
    { id: 301, userId: 3, title: 'Mehmet - Herkese Açık Yemek Tarifleri', content: 'Harika bir çorba tarifi.', visibility: 'public' },
    { id: 302, userId: 3, title: 'Mehmet - Arkadaşlar Özel Eğlence Planları', content: 'Hafta sonu mangal var.', visibility: 'friends' },
    { id: 303, userId: 3, title: 'Mehmet - Sadece Bana Özel Notlar', content: 'Gizli tarifler...', visibility: 'private' },
];

// --- Erişim Kontrolü Fonksiyonu ---

/**
 * İki kullanıcının arkadaş olup olmadığını kontrol eder.
 * @param userAId Kullanıcı A'nın ID'si
 * @param userBId Kullanıcı B'nin ID'si
 * @returns Arkadaşlarsa true, değilse false.
 */
function areFriends(userAId: number, userBId: number): boolean {
    if (userAId === userBId) return false; // Kendinle arkadaş olamazsın (simülasyon için)
    
    // Arkadaşlık bağlarını kontrol et (çift yönlü)
    return FRIENDS.some(([id1, id2]) => 
        (id1 === userAId && id2 === userBId) || (id1 === userBId && id2 === userAId)
    );
}

/**
 * Kullanıcının görebileceği postları filtreler.
 * Ana Erişim Kontrolü Simülasyonu mantığı buradadır.
 * * Filtreleme Mantığı:
 * 1. Post Herkese Açık ise (public): Görüntüle.
 * 2. Postun sahibi sensen: Görüntüle (private, friends, public fark etmez).
 * 3. Postun sahibi arkadaşınsa VE post "friends" ise: Görüntüle.
 * 4. Diğer durumlarda: Görüntüleme.
 * * @param currentUserId Simülasyonu yapan kullanıcının ID'si.
 * @param posts Tüm postlar dizisi.
 * @returns Görüntülenebilir postlar dizisi.
 */
function filterPosts(currentUserId: number, posts: Post[]): Post[] {
    return posts.filter(post => {
        // Kendi postları: Her zaman görünür (1. kural)
        if (post.userId === currentUserId) {
            return true;
        }

        // Herkese açık postlar: Her zaman görünür (2. kural)
        if (post.visibility === 'public') {
            return true;
        }

        // Arkadaşların özel postları: 
        if (post.visibility === 'friends') {
            const isFriend = areFriends(currentUserId, post.userId);
            // Postun sahibi arkadaşınsa VE gizlilik 'friends' ise görünür (3. kural)
            if (isFriend) {
                return true;
            }
        }

        // private postlar (başkasına aitse) veya friends postlar (arkadaşın değilse) görünmez.
        return false;
    });
}


// --- Express Ayarları ---
const app = express();
const port = 3000;

// EJS View Motorunu ayarla
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

app.get('/', (req: Request, res: Response) => {
    // URL'den kullanıcı ID'sini al. Varsayılan Ayşe (ID: 1).
    const userId = parseInt(req.query.user as string, 10) || 1;
    const currentUser = USERS.find(u => u.id === userId);

    if (!currentUser) {
        return res.status(404).send('Kullanıcı bulunamadı.');
    }
    
    // Erişim Kontrolü Simülasyonu
    const visiblePosts = filterPosts(currentUser.id, POSTS);
    
    // Arkadaşlık durumlarını metin olarak hazırla
    const friendStatus = USERS.map(user => {
        if (user.id === currentUser.id) {
            return `${user.name} (Sensin)`;
        }
        return `${user.name} (${areFriends(currentUser.id, user.id) ? 'Arkadaşın' : 'Değil'})`;
    });

    res.render('index', {
        currentUser,
        users: USERS,
        visiblePosts,
        friendStatus: friendStatus.join(' | ')
    });
});

app.listen(port, () => {
    console.log(`🚀 Sunucu http://localhost:${port} adresinde çalışıyor...`);
    console.log(`Simülasyon Aktif: ${USERS.find(u => u.id === 1)?.name} olarak giriş yapıldı.`);
    console.log('Hot-reload aktif!');
});