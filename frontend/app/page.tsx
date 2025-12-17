"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Shield, Users, Plus, Trash2, 
  CheckCircle, XCircle, ChevronRight, Activity, Clock, AlertCircle 
} from 'lucide-react';


import SafeClubArtifact from '../utils/SafeClub.json';
import ContractAddress from '../utils/contract-address.json';

const SafeClubAddress = ContractAddress.SafeClub;

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 ${className}`}
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
    {children}
  </motion.div>
);

export default function Home() {
  
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [account, setAccount] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  
  const [balance, setBalance] = useState('0');
  const [members, setMembers] = useState<string[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  
  const [newMember, setNewMember] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [propTo, setPropTo] = useState('');
  const [propAmount, setPropAmount] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [propDeadline, setPropDeadline] = useState('');


  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
    }
   
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000); 
    return () => clearInterval(timer);
  }, []);

  const getReadableError = (error: any) => {
    if (error.reason) return error.reason;
    if (error.code === "ACTION_REJECTED") return "Transaction annulée.";
    if (error.code === "CALL_EXCEPTION") return "Erreur contrat : Vérifiez membres, balance ou date.";
    return error.shortMessage || error.message || "Erreur inconnue.";
  };

  const connectWallet = async () => {
    if (!provider) return alert("Installez MetaMask.");
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      const signer = await provider.getSigner();
      setSigner(signer);
      const safeClub = new ethers.Contract(SafeClubAddress, SafeClubArtifact, signer);
      setContract(safeClub);
      const ownerAddr = await safeClub.owner();
      setOwner(ownerAddr);
      setIsOwner(ownerAddr.toLowerCase() === accounts[0].toLowerCase());
      updateData(safeClub);
    } catch (err: any) { alert(getReadableError(err)); }
  };

  const updateData = async (safeClub: any) => {
    try {
      const bal = await safeClub.getBalance();
      setBalance(ethers.formatEther(bal));

      const loadedMembers = [];
      let i = 0;
      while (true) {
        try {
          const addr = await safeClub.memberList(i);
          const memberInfo = await safeClub.members(addr);
          if (memberInfo.isMember) loadedMembers.push(addr);
          i++;
        } catch (e) { break; }
      }
      setMembers(loadedMembers);

      const count = await safeClub.proposalCount();
      const loadedProposals = [];
      for (let i = 0; i < count; i++) {
        const p = await safeClub.proposals(i);
        loadedProposals.push({
          id: i,
          to: p.to,
          amount: ethers.formatEther(p.amount),
          description: p.description,
          // IMPORTANT : On stocke le timestamp brut pour la logique
          deadlineRaw: Number(p.deadline) * 1000, 
          deadline: new Date(Number(p.deadline) * 1000).toLocaleString(),
          votesFor: p.votesFor.toString(),
          votesAgainst: p.votesAgainst.toString(),
          executed: p.executed
        });
      }
      setProposals(loadedProposals);
    } catch (err) { console.error(err); }
  };

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeposit = () => withLoading(async () => {
    if (!contract || !depositAmount) return;
    try {
      const tx = await signer.sendTransaction({ to: SafeClubAddress, value: ethers.parseEther(depositAmount) });
      await tx.wait();
      setDepositAmount('');
      alert("Dépôt réussi !");
      updateData(contract);
    } catch (err) { alert(getReadableError(err)); }
  });

  const handleAddMember = () => withLoading(async () => {
    if (!contract || !newMember) return;
    try {
      const tx = await contract.addMember(newMember);
      await tx.wait();
      setNewMember('');
      alert("Membre ajouté !");
      updateData(contract);
    } catch (err) { alert(getReadableError(err)); }
  });

  const handleRemoveMember = (addr: string) => withLoading(async () => {
    if (!contract) return;
    try {
      const tx = await contract.removeMember(addr);
      await tx.wait();
      alert("Membre retiré !");
      updateData(contract);
    } catch (err) { alert(getReadableError(err)); }
  });

  const handleCreateProposal = () => withLoading(async () => {
    if (!contract) return;
    if (!propTo || !propAmount || !propDesc || !propDeadline) return alert("Remplissez tout.");
    
    const targetDate = new Date(propDeadline).getTime();
    if (targetDate <= Date.now()) return alert("Date invalide (doit être future).");
    if (ethers.parseEther(propAmount) > ethers.parseEther(balance)) return alert("Fonds insuffisants.");

    try {
      const ts = Math.floor(targetDate / 1000);
      const tx = await contract.createProposal(propTo, ethers.parseEther(propAmount), propDesc, ts);
      await tx.wait();
      setPropTo(''); setPropAmount(''); setPropDesc(''); setPropDeadline('');
      alert("Proposition créée !");
      updateData(contract);
    } catch (err: any) { alert(getReadableError(err)); }
  });

  const handleVote = (id: number, support: boolean) => withLoading(async () => {
    if (!contract) return;
    try {
      const tx = await contract.vote(id, support);
      await tx.wait();
      alert("Vote pris en compte !");
      updateData(contract);
    } catch (err) { alert(getReadableError(err)); }
  });

  const handleExecute = (id: number) => withLoading(async () => {
    if (!contract) return;
    try {
      const tx = await contract.executeProposal(id);
      await tx.wait();
      alert("Exécuté !");
      updateData(contract);
    } catch (err) { alert(getReadableError(err)); }
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">SafeClub</h1>
              <p className="text-xs text-gray-400 tracking-widest uppercase">Decentralized Treasury</p>
            </div>
          </div>
          {!account ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={connectWallet} className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 text-white font-bold text-lg"><Wallet className="w-5 h-5" /><span>Connect MetaMask</span><ChevronRight className="w-5 h-5" /></div>
            </motion.button>
          ) : (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-6 py-2 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-sm text-gray-300">{account.substring(0, 6)}...{account.substring(38)}</span>
            </div>
          )}
        </header>

        {account && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <GlassCard className="text-center py-10">
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Treasury Balance</p>
                <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-6">{balance} <span className="text-2xl text-gray-500">ETH</span></div>
                <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                  <input type="number" placeholder="0.0 ETH" className="bg-transparent w-full px-4 py-2 outline-none text-white font-mono" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                  <button onClick={handleDeposit} disabled={loading} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg"><Plus className="w-5 h-5" /></button>
                </div>
              </GlassCard>

              {isOwner && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-6 text-purple-400"><Users className="w-5 h-5" /><h2 className="text-lg font-bold uppercase tracking-wider">Membership</h2></div>
                  <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="Address 0x..." className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 w-full text-sm outline-none focus:border-purple-500 transition-colors" value={newMember} onChange={(e) => setNewMember(e.target.value)} />
                    <button onClick={handleAddMember} disabled={loading} className="bg-purple-600 hover:bg-purple-500 px-4 rounded-xl"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {members.map((member, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group">
                        <span className="font-mono text-xs text-gray-400">{member.substring(0, 6)}...{member.substring(38)}</span>
                        <button onClick={() => handleRemoveMember(member)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>

            <div className="lg:col-span-8 space-y-8">
              <GlassCard>
                <div className="flex items-center gap-2 mb-6 text-yellow-400"><Activity className="w-5 h-5" /><h2 className="text-lg font-bold uppercase tracking-wider">New Proposal</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">Recipient</label><input type="text" placeholder="0x..." className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-500/50" value={propTo} onChange={e => setPropTo(e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-xs text-gray-500 ml-1">Amount (ETH)</label><input type="number" placeholder="0.0" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-500/50" value={propAmount} onChange={e => setPropAmount(e.target.value)} /></div>
                  <div className="md:col-span-2 space-y-1"><label className="text-xs text-gray-500 ml-1">Description</label><input type="text" placeholder="Reason..." className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-500/50" value={propDesc} onChange={e => setPropDesc(e.target.value)} /></div>
                  <div className="md:col-span-2 space-y-1"><label className="text-xs text-gray-500 ml-1">Deadline</label><input type="datetime-local" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-500/50 text-gray-400" value={propDeadline} onChange={e => setPropDeadline(e.target.value)} /></div>
                  <button onClick={handleCreateProposal} disabled={loading} className="md:col-span-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-yellow-900/20 transition-all mt-2">Submit Proposal</button>
                </div>
              </GlassCard>

              <div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">Governance <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-normal">{proposals.length}</span></h3>
                <div className="grid gap-6">
                  <AnimatePresence>
                    {proposals.map((p) => {
                      // --- LOGIQUE D'AFFICHAGE DES BOUTONS ---
                      const isExpired = currentTime > p.deadlineRaw;
                      const hasPassed = Number(p.votesFor) > Number(p.votesAgainst);
                      // ----------------------------------------

                      return (
                        <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-6 rounded-3xl border ${p.executed ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'} backdrop-blur-sm transition-all hover:border-white/20`}>
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-mono text-gray-500">#{p.id}</span>
                                <h4 className="text-xl font-bold text-white">{p.description}</h4>
                                {p.executed && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Executed</span>}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                                <div><p className="text-gray-500 text-xs">Beneficiary</p><p className="font-mono text-blue-300">{p.to.substring(0,6)}...{p.to.substring(38)}</p></div>
                                <div><p className="text-gray-500 text-xs">Ask</p><p className="font-mono text-white">{p.amount} ETH</p></div>
                                <div><p className="text-gray-500 text-xs">Deadline</p><p className={`truncate ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>{p.deadline}</p></div>
                              </div>
                              <div className="mt-6 flex items-center gap-2">
                                <div className="h-2 flex-1 bg-gray-700 rounded-full overflow-hidden flex">
                                  <div style={{width: `${(Number(p.votesFor) / (Number(p.votesFor) + Number(p.votesAgainst) || 1)) * 100}%`}} className="bg-green-500" />
                                  <div style={{width: `${(Number(p.votesAgainst) / (Number(p.votesFor) + Number(p.votesAgainst) || 1)) * 100}%`}} className="bg-red-500" />
                                </div>
                                <span className="text-xs text-gray-400 min-w-[80px] text-right">{Number(p.votesFor)} Y / {Number(p.votesAgainst)} N</span>
                              </div>
                            </div>

                            {/* --- ACTIONS DYNAMIQUES --- */}
                            <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                              
                              {/* CAS 1 : Déjà exécuté */}
                              {p.executed ? (
                                <div className="flex flex-col items-center justify-center h-full text-green-500 gap-1 opacity-50">
                                  <CheckCircle className="w-8 h-8" />
                                  <span className="text-sm font-bold">Done</span>
                                </div>
                              ) : (
                                <>
                                  {/* CAS 2 : En cours (Pas expiré) -> On peut voter */}
                                  {!isExpired && (
                                    <>
                                      <button onClick={() => handleVote(p.id, true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors w-full">
                                        <CheckCircle className="w-4 h-4" /> Vote Yes
                                      </button>
                                      <button onClick={() => handleVote(p.id, false)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors w-full">
                                        <XCircle className="w-4 h-4" /> Vote No
                                      </button>
                                      <div className="mt-2 text-center">
                                        <span className="text-xs text-yellow-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Active</span>
                                      </div>
                                    </>
                                  )}

                                  {/* CAS 3 : Expiré -> Execute ou Rejected */}
                                  {isExpired && (
                                    <>
                                      {hasPassed ? (
                                        // GAGNÉ : Bouton Execute
                                        <button onClick={() => handleExecute(p.id)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold shadow-lg shadow-blue-900/20 transition-all w-full h-full">
                                          Execute Action
                                        </button>
                                      ) : (
                                        // PERDU : Badge Rejected
                                        <div className="flex flex-col items-center justify-center h-full text-red-500 gap-1 border border-red-500/20 bg-red-500/5 rounded-xl">
                                          <AlertCircle className="w-6 h-6" />
                                          <span className="text-sm font-bold">Rejected</span>
                                          <span className="text-[10px] text-red-400/70">Vote Failed</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {proposals.length === 0 && <div className="text-center py-12 text-gray-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">No active proposals</div>}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-purple-300 font-bold tracking-widest animate-pulse">TRANSACTION PENDING...</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}